const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Check if Mongoose is connected to MongoDB Atlas
function isConnected() {
  return mongoose.connection.readyState === 1;
}

// Check if a password string is already a bcrypt hash
function isBcryptHash(pass) {
  if (typeof pass !== 'string') return false;
  return pass.startsWith('$2a$') || pass.startsWith('$2b$') || pass.startsWith('$2y$');
}

// Load collection from local JSON file
function loadCollection(name) {
  const filePath = path.join(DATA_DIR, `${name.toLowerCase()}s.json`);
  
  // If file doesn't exist, try to check if it's users and exists in root
  if (!fs.existsSync(filePath)) {
    if (name.toLowerCase() === 'user') {
      const rootUsersPath = path.join(__dirname, '..', '..', 'users.json');
      if (fs.existsSync(rootUsersPath)) {
        try {
          const data = fs.readFileSync(rootUsersPath, 'utf8');
          fs.writeFileSync(filePath, data, 'utf8');
          return JSON.parse(data);
        } catch (e) {
          console.error('Error migrating users.json to data directory:', e);
        }
      }
    }
    // Write empty array as default
    fs.writeFileSync(filePath, '[]', 'utf8');
    return [];
  }

  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error(`Error reading ${name} collection:`, err);
    return [];
  }
}

// Save collection to local JSON file
function saveCollection(name, data) {
  const filePath = path.join(DATA_DIR, `${name.toLowerCase()}s.json`);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error(`Error saving ${name} collection:`, err);
  }
}

// Generate a random MongoDB-like hex string ID
function generateId() {
  return Array.from({ length: 24 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

// Helper to filter documents based on query
function matchQuery(doc, query) {
  if (!query) return true;
  
  // If query is an ID string or ObjectId
  if (typeof query === 'string' || (query && query.constructor && query.constructor.name === 'ObjectId')) {
    const qStr = query.toString();
    return doc._id === qStr || doc.id === qStr;
  }

  for (const key in query) {
    const queryVal = query[key];
    const docVal = doc[key];

    if (queryVal && typeof queryVal === 'object') {
      // Support MongoDB operators
      if (queryVal.$in && Array.isArray(queryVal.$in)) {
        const inVals = queryVal.$in.map(v => v ? v.toString() : '');
        if (!inVals.includes(docVal ? docVal.toString() : '')) return false;
      } else if (queryVal.$nin && Array.isArray(queryVal.$nin)) {
        const ninVals = queryVal.$nin.map(v => v ? v.toString() : '');
        if (ninVals.includes(docVal ? docVal.toString() : '')) return false;
      } else {
        // Simple fallback check
        if (JSON.stringify(docVal) !== JSON.stringify(queryVal)) return false;
      }
    } else {
      if (docVal !== queryVal) {
        if (key === 'isActive' && queryVal === true && docVal === undefined) {
          continue;
        }
        // Allow check by string comparison if one is ID/ObjectId
        if (docVal && queryVal && docVal.toString() === queryVal.toString()) {
          continue;
        }
        return false;
      }
    }
  }
  return true;
}

// Create a chainable query builder
function createQueryChain(promise) {
  const chain = {
    populate: function() { return this; },
    sort: function(criteria) { 
      promise = promise.then(data => {
        if (!Array.isArray(data)) return data;
        const sorted = [...data];
        if (typeof criteria === 'string') {
          const isDesc = criteria.startsWith('-');
          const field = isDesc ? criteria.substring(1) : criteria;
          sorted.sort((a, b) => {
            const valA = a[field];
            const valB = b[field];
            if (valA < valB) return isDesc ? 1 : -1;
            if (valA > valB) return isDesc ? -1 : 1;
            return 0;
          });
        }
        return sorted;
      });
      return this;
    },
    select: function() { return this; },
    exec: function() { return promise; },
    then: function(onResolve, onReject) {
      return promise.then(onResolve, onReject);
    },
    catch: function(onReject) {
      return promise.catch(onReject);
    }
  };
  return chain;
}

// Wrap mongoose model
function wrapModel(modelName, realModel) {
  const fallback = {
    // 1. FIND
    find: function(query) {
      const promise = Promise.resolve().then(() => {
        if (isConnected()) {
          return realModel.find(query);
        }
        const data = loadCollection(modelName);
        const filtered = data.filter(doc => matchQuery(doc, query));
        return filtered.map(doc => enhanceDocument(doc, modelName));
      });
      return createQueryChain(promise);
    },

    // 2. FIND ONE
    findOne: function(query) {
      const promise = Promise.resolve().then(() => {
        if (isConnected()) {
          return realModel.findOne(query);
        }
        const data = loadCollection(modelName);
        const match = data.find(doc => matchQuery(doc, query));
        return match ? enhanceDocument(match, modelName) : null;
      });
      return createQueryChain(promise);
    },

    // 3. FIND BY ID
    findById: function(id) {
      const promise = Promise.resolve().then(() => {
        if (isConnected()) {
          return realModel.findById(id);
        }
        const data = loadCollection(modelName);
        const match = data.find(doc => doc._id === id || doc.id === id || (doc._id && doc._id.toString() === id.toString()));
        return match ? enhanceDocument(match, modelName) : null;
      });
      return createQueryChain(promise);
    },

    // 4. CREATE
    create: async function(docOrDocs) {
      if (isConnected()) {
        return realModel.create(docOrDocs);
      }

      const docs = Array.isArray(docOrDocs) ? docOrDocs : [docOrDocs];
      const data = loadCollection(modelName);
      const createdDocs = [];

      for (let doc of docs) {
        const newDoc = { ...doc };
        newDoc._id = newDoc._id || generateId();
        newDoc.id = newDoc._id;
        newDoc.createdAt = newDoc.createdAt || new Date().toISOString();
        newDoc.updatedAt = newDoc.updatedAt || new Date().toISOString();

        // Specific hashing logic for Users
        if (modelName.toLowerCase() === 'user' && newDoc.password && !isBcryptHash(newDoc.password)) {
          const salt = await bcrypt.genSalt(10);
          newDoc.password = await bcrypt.hash(newDoc.password, salt);
        }

        data.push(newDoc);
        createdDocs.push(enhanceDocument(newDoc, modelName));
      }

      saveCollection(modelName, data);
      return Array.isArray(docOrDocs) ? createdDocs : createdDocs[0];
    },

    // 5. INSERT MANY
    insertMany: async function(docs) {
      if (isConnected()) {
        return realModel.insertMany(docs);
      }
      return this.create(docs);
    },

    // 6. FIND BY ID AND UPDATE
    findByIdAndUpdate: async function(id, update, options) {
      if (isConnected()) {
        return realModel.findByIdAndUpdate(id, update, options);
      }

      const data = loadCollection(modelName);
      const index = data.findIndex(doc => doc._id === id || doc.id === id);
      if (index === -1) return null;

      // Extract update fields
      const updatedFields = update.$set ? { ...update.$set } : { ...update };
      const doc = { ...data[index], ...updatedFields, updatedAt: new Date().toISOString() };
      
      // Hash password if modified and plain
      if (modelName.toLowerCase() === 'user' && doc.password && !isBcryptHash(doc.password)) {
        const salt = await bcrypt.genSalt(10);
        doc.password = await bcrypt.hash(doc.password, salt);
      }

      data[index] = doc;
      saveCollection(modelName, data);
      return enhanceDocument(doc, modelName);
    },

    // 7. FIND ONE AND UPDATE
    findOneAndUpdate: async function(query, update, options) {
      if (isConnected()) {
        return realModel.findOneAndUpdate(query, update, options);
      }

      const data = loadCollection(modelName);
      const index = data.findIndex(doc => matchQuery(doc, query));
      if (index === -1) return null;

      const updatedFields = update.$set ? { ...update.$set } : { ...update };
      const doc = { ...data[index], ...updatedFields, updatedAt: new Date().toISOString() };

      if (modelName.toLowerCase() === 'user' && doc.password && !isBcryptHash(doc.password)) {
        const salt = await bcrypt.genSalt(10);
        doc.password = await bcrypt.hash(doc.password, salt);
      }

      data[index] = doc;
      saveCollection(modelName, data);
      return enhanceDocument(doc, modelName);
    },

    // 8. FIND BY ID AND DELETE
    findByIdAndDelete: async function(id) {
      if (isConnected()) {
        return realModel.findByIdAndDelete(id);
      }

      const data = loadCollection(modelName);
      const index = data.findIndex(doc => doc._id === id || doc.id === id);
      if (index === -1) return null;

      const deleted = data.splice(index, 1)[0];
      saveCollection(modelName, data);
      return enhanceDocument(deleted, modelName);
    },

    // 9. DELETE MANY
    deleteMany: async function(query) {
      if (isConnected()) {
        return realModel.deleteMany(query);
      }

      if (!query || Object.keys(query).length === 0) {
        saveCollection(modelName, []);
        return { deletedCount: loadCollection(modelName).length };
      }

      const data = loadCollection(modelName);
      const originalCount = data.length;
      const filtered = data.filter(doc => !matchQuery(doc, query));
      saveCollection(modelName, filtered);
      return { deletedCount: originalCount - filtered.length };
    },

    // 10. COUNT DOCUMENTS
    countDocuments: async function(query) {
      if (isConnected()) {
        return realModel.countDocuments(query);
      }
      const data = loadCollection(modelName);
      if (!query || Object.keys(query).length === 0) {
        return data.length;
      }
      return data.filter(doc => matchQuery(doc, query)).length;
    }
  };

  return fallback;
}

// Enhance standard document object to mimic mongoose document instance methods
function enhanceDocument(doc, modelName) {
  if (!doc) return doc;
  
  const enhanced = { ...doc };

  if (modelName.toLowerCase() === 'hotel') {
    if (enhanced.isActive === undefined) {
      enhanced.isActive = true;
    }
  }

  // save() method
  enhanced.save = async function() {
    if (isConnected()) {
      if (typeof doc.save === 'function') {
        return doc.save();
      }
    }

    const data = loadCollection(modelName);
    const index = data.findIndex(item => item._id === enhanced._id);
    
    enhanced.updatedAt = new Date().toISOString();

    // Specific password hashing before saving
    if (modelName.toLowerCase() === 'user' && enhanced.password && !isBcryptHash(enhanced.password)) {
      const salt = await bcrypt.genSalt(10);
      enhanced.password = await bcrypt.hash(enhanced.password, salt);
    }

    if (index !== -1) {
      data[index] = { ...enhanced };
    } else {
      data.push({ ...enhanced });
    }

    saveCollection(modelName, data);
    return enhanced;
  };

  // toObject() method
  enhanced.toObject = function() {
    return { ...enhanced };
  };

  // toSafeJSON() method
  enhanced.toSafeJSON = function() {
    const obj = { ...enhanced };
    delete obj.password;
    obj.id = obj.id || (obj._id ? obj._id.toString() : '');
    return obj;
  };

  // comparePassword() method
  enhanced.comparePassword = async function(candidatePassword) {
    if (!enhanced.password) return false;
    if (candidatePassword === enhanced.password) return true;
    try {
      return await bcrypt.compare(candidatePassword, enhanced.password);
    } catch (err) {
      return false;
    }
  };

  return enhanced;
}

module.exports = {
  wrapModel,
  isConnected
};
