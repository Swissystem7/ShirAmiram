// Preview page theme: ?theme=light|dark pins it (used for the screenshots); otherwise the system setting wins.
// The button with id "themeBtn" toggles it. Loaded in <head> so a pinned theme applies before first paint.
(() => {
	const root = document.documentElement;
	try {
		const pinned = new URLSearchParams(location.search).get("theme");
		if (pinned === "light" || pinned === "dark")
			root.setAttribute("data-theme", pinned);
	} catch {
		// No URL access (for example a sandboxed viewer): keep the system theme.
	}
	document.addEventListener("DOMContentLoaded", () => {
		const button = document.getElementById("themeBtn");
		if (!button) return;
		button.addEventListener("click", () => {
			const dark = matchMedia("(prefers-color-scheme: dark)").matches;
			const current =
				root.getAttribute("data-theme") || (dark ? "dark" : "light");
			root.setAttribute("data-theme", current === "dark" ? "light" : "dark");
		});
	});
})();
