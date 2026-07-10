// Make My Travel - Driver Partner Interactions

document.addEventListener('DOMContentLoaded', () => {
  initDriverRegistration();
  initMediaUploadInteraction();
});

// 1. Handle Driver Registration Form Submission
function initDriverRegistration() {
  const form = document.getElementById('driver-registration-form');
  const modalOverlay = document.getElementById('driver-success-modal');
  const modalClose = document.getElementById('driver-modal-close');
  const modalOk = document.getElementById('driver-modal-ok');
  const modalDetails = document.getElementById('driver-app-details');

  if (!form || !modalOverlay) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    
    // Map form data to backend Cab model fields
    const cabData = {
      driver: formData.get('driverName'),
      driverExp: Number(formData.get('driverExp')),
      licenseNum: formData.get('licenseNum'),
      vehicle: formData.get('cabModel'),
      category: formData.get('cabCategory'),
      plate: formData.get('plateNumber'),
      seats: formData.get('cabCapacity'),
      driverEmail: formData.get('driverEmail'),
      mobile: formData.get('driverPhone'),
      city: formData.get('driverCity'),
      ratePerKm: Number(formData.get('ratePerKm')),
      cabId: `MMT-DRV-${Math.floor(100000 + Math.random() * 900000)}`,
      status: 'Pending'
    };

    try {
      const response = await fetch('/api/cabs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(cabData)
      });

      if (!response.ok) {
        throw new Error('Failed to register cab');
      }

      const savedCab = await response.json();
      const referenceId = savedCab.cabId || cabData.cabId;

      // Build the summary HTML details
      modalDetails.innerHTML = `
        <p><strong>Driver Ref ID:</strong> <span style="font-family: monospace; color: var(--secondary-color); font-weight: 700;">${referenceId}</span></p>
        <p><strong>Partner Name:</strong> ${cabData.driver}</p>
        <p><strong>Vehicle Model:</strong> ${cabData.vehicle} (${cabData.category})</p>
        <p><strong>Plate Number:</strong> ${cabData.plate}</p>
        <p><strong>Operating Area:</strong> ${cabData.city}</p>
        <p><strong>Expected Rate:</strong> ₹${cabData.ratePerKm}/KM</p>
        <p><strong>Contact Phone:</strong> ${cabData.mobile}</p>
      `;

      // Show success modal
      modalOverlay.style.display = 'flex';
      setTimeout(() => {
        modalOverlay.classList.add('active');
      }, 10);
      
      form.reset();
    } catch (error) {
      console.error('Error submitting driver registration:', error);
      alert('Registration failed. Please try again.');
    }
  });

  // Modal Closing handlers - redirect back to main page on close
  const closeModalAndRedirect = () => {
    modalOverlay.classList.remove('active');
    setTimeout(() => {
      modalOverlay.style.display = 'none';
      // Redirect back to main website home
      window.location.href = 'index.html';
    }, 300);
  };

  if (modalClose) modalClose.addEventListener('click', closeModalAndRedirect);
  if (modalOk) modalOk.addEventListener('click', closeModalAndRedirect);

  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      closeModalAndRedirect();
    }
  });
}

// 2. Drag & Drop Document Upload Area Click Interaction
function initMediaUploadInteraction() {
  const uploadArea = document.getElementById('media-upload-area');
  const fileInput = document.getElementById('driver-doc-upload');

  if (!uploadArea || !fileInput) return;

  // Clicking the card triggers the file picker
  uploadArea.addEventListener('click', () => {
    fileInput.click();
  });

  // Handle selected file
  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
      const fileName = fileInput.files[0].name;
      const fileSize = (fileInput.files[0].size / (1024 * 1024)).toFixed(2); // MB
      
      // Update upload box UI with success checks
      uploadArea.innerHTML = `
        <i class="fa-solid fa-circle-check" style="color: var(--secondary-color);"></i>
        <span style="font-weight: 600; color: var(--secondary-color); font-size: 0.95rem;">Document Selected Successfully!</span>
        <span style="font-size: 0.8rem; color: var(--text-main); font-weight: 500;">${fileName} (${fileSize} MB)</span>
        <span style="font-size: 0.7rem; color: var(--text-muted); text-decoration: underline;">Click to choose a different file</span>
      `;
    }
  });

  // Drag & drop highlight prevention
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    uploadArea.addEventListener(eventName, preventDefaults, false);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  ['dragenter', 'dragover'].forEach(eventName => {
    uploadArea.addEventListener(eventName, () => {
      uploadArea.style.borderColor = 'var(--secondary-color)';
      uploadArea.style.backgroundColor = '#FDF2F0';
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    uploadArea.addEventListener(eventName, () => {
      uploadArea.style.borderColor = 'var(--border-color)';
      uploadArea.style.backgroundColor = '#F8FAFC';
    }, false);
  });

  // Handle dropped file
  uploadArea.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    
    if (files.length > 0) {
      fileInput.files = files; // Assign to input
      
      // Trigger change event to run label updates
      const event = new Event('change');
      fileInput.dispatchEvent(event);
    }
  });
}
