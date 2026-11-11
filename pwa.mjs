let installPrompt;
const standalone = matchMedia('(display-mode: standalone)');

function updateInstallState() {
  document.documentElement.classList.toggle('pwa-installed', standalone.matches || navigator.standalone === true);
}

function showInstallHelp() {
  let dialog = document.querySelector('#install-help');
  if (!dialog) {
    dialog = document.createElement('dialog');
    dialog.id = 'install-help';
    dialog.setAttribute('aria-labelledby', 'install-title');
    dialog.innerHTML = `
      <img src="./icons/icon-192.png" alt="" width="72" height="72">
      <h2 id="install-title">Taksi Defteri’ni yükle</h2>
      <p><strong>iPhone</strong><br>Safari’de Paylaş → Ana Ekrana Ekle.</p>
      <p><strong>Android</strong><br>Chrome menüsü → Uygulamayı yükle veya Ana ekrana ekle.</p>
      <form method="dialog"><button class="button primary">Tamam</button></form>`;
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
    });
    document.body.append(dialog);
  }
  dialog.showModal();
}

function updateConnectivity() {
  let status = document.querySelector('#offline-status');
  if (navigator.onLine) {
    status?.remove();
    return;
  }
  if (!status) {
    status = document.createElement('div');
    status.id = 'offline-status';
    status.setAttribute('role', 'status');
    status.textContent = 'Çevrimdışı · Son kaydedilen veriler';
    document.body.append(status);
  }
}

addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  installPrompt = event;
});
addEventListener('appinstalled', () => {
  installPrompt = null;
  document.documentElement.classList.add('pwa-installed');
  document.querySelector('#install-help')?.close();
});
standalone.addEventListener('change', updateInstallState);
addEventListener('online', updateConnectivity);
addEventListener('offline', updateConnectivity);

document.addEventListener('click', async event => {
  const button = event.target.closest('[data-install-app]');
  if (!button) return;
  if (!installPrompt) {
    showInstallHelp();
    return;
  }
  const prompt = installPrompt;
  installPrompt = null;
  button.disabled = true;
  try {
    await prompt.prompt();
    await prompt.userChoice;
  } catch {
    showInstallHelp();
  } finally {
    button.disabled = false;
  }
});

updateInstallState();
updateConnectivity();
if ('serviceWorker' in navigator && document.querySelector('meta[name="ada-mode"]')) {
  navigator.serviceWorker.register(new URL('./sw.js', import.meta.url), {updateViaCache: 'none'})
    .catch(error => console.warn('Uygulama önbelleği hazırlanamadı.', error));
}
