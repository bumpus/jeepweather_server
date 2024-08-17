// Saves options to chrome.storage
const saveOptions = () => {
  const ChromeService = document.getElementById('auto-location').checked;
  const user = document.getElementById('manual-location').value;
  const useCelcius = document.getElementById('celcius').checked;

  chrome.storage.local.set(
    { autoLocation: ChromeService, manualLocation: user, celcius: useCelcius },
    () => {
      // Update status to let user know options were saved.
      const status = document.getElementById('status');
      status.textContent = 'Options saved.';
      setTimeout(() => {
        status.textContent = '';
      }, 750);
    }
  );
};

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
const restoreOptions = () => {
  chrome.storage.local.get(
    { autoLocation: 'true', manualLocation: '', calcius: 'false' },
    (items) => {
      console.log(items);
      document.getElementById('auto-location').checked = items.autoLocation;
      document.getElementById('manual-location').value = items.manualLocation;
      document.getElementById('celcius').value = items.celcius;
      disableManualField();
    }
  );
};

const disableManualField = () => {
  console.log("checkbox changed");
  if (document.getElementById('auto-location').checked){
    console.log("checkbox is checked, disable text");
    document.getElementById('manual-location').disabled = true;
  }
  else{
    console.log("checkbox is not checked, enable text");
    document.getElementById('manual-location').disabled = false;
  }
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);
document.getElementById('auto-location').addEventListener('change', disableManualField);
