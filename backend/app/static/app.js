document.querySelectorAll("[data-confirm]").forEach((element) =>
	element.addEventListener("click", (event) => {
		if (!confirm(element.dataset.confirm)) event.preventDefault();
	}),
);
document
	.querySelectorAll("textarea.description-textarea")
	.forEach((element) => {
		const resize = () => {
			element.style.height = "auto";
			element.style.height = `${element.scrollHeight}px`;
		};
		element.addEventListener("input", resize);
		resize();
	});
const importer = document.querySelector("#import-local-data");
if (importer)
	importer.addEventListener("click", async () => {
		const result = document.querySelector("#migration-result");
		try {
			const tasks = JSON.parse(
				localStorage.getItem("pocketmind.tasks.v2") || "[]",
			);
			const settings = JSON.parse(
				localStorage.getItem("pocketmind.settings.v1") || "{}",
			);
			const response = await fetch("/migration/import", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-CSRF-Token":
						document.querySelector("input[name=csrf]")?.value || "",
				},
				body: JSON.stringify({ tasks, settings }),
			});
			if (!response.ok) throw new Error("Import failed");
			result.textContent = "Import complete";
			setTimeout(() => location.assign("/"), 800);
		} catch {
			result.textContent = "Import failed. Your browser data was not removed.";
		}
	});
