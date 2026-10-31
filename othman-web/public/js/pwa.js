
// --- Service Worker Registration ---
if ("serviceWorker" in navigator) {
    window.addEventListener("load", async () => {
        try {
            const registration = await navigator.serviceWorker.register("/js/service-worker.js");
            console.log("SW registered:", registration);

            // Optional: listen for updates
            registration.addEventListener("updatefound", () => {
                console.log("New service worker available");
            });

        } catch (error) {
            console.error("SW registration failed:", error);
        }
    });
}

// --- Install Prompt Handling ---
let deferredPrompt = null;
const installBtn = document.getElementById("installBtn");

if (installBtn) {
    installBtn.style.display = "none";

    window.addEventListener("beforeinstallprompt", (e) => {
        e.preventDefault();
        deferredPrompt = e;

        installBtn.style.display = "block";
    });

    installBtn.addEventListener("click", async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();

        const { outcome } = await deferredPrompt.userChoice;
        console.log("User choice:", outcome);

        // Reset so it can't be reused
        deferredPrompt = null;
        installBtn.style.display = "none";
    });
}

// --- Detect if already installed ---
window.addEventListener("appinstalled", () => {
    console.log("App installed");
    deferredPrompt = null;
    if (installBtn) installBtn.style.display = "none";
});