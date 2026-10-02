"use client";

import { useState } from "react";
import Link from "next/link";

export default function Backup() {
	const [message, setMessage] = useState("");
	const [busy, setBusy] = useState(false);

	async function restore(event: React.ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		if (!file) return;
		setBusy(true);
		setMessage("");

		try {
			const data = JSON.parse(await file.text());
			const collections = data.collections || {};
			const notebookEntries = Array.isArray(collections.notebookEntries) ? collections.notebookEntries : [];
			const repairEntries = [
				...notebookEntries.filter((entry: any) => entry?.recordType === "REPAIR"),
				...(Array.isArray(collections.repairs) ? collections.repairs : []),
			];
			const legacyNotebookEntries = notebookEntries.filter((entry: any) => entry?.recordType !== "REPAIR");

			if (legacyNotebookEntries.length) {
				const response = await fetch("/api/notebook/restore", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ entries: legacyNotebookEntries }),
				});
				const result = await response.json();
				if (!response.ok) throw new Error(result.error || "Notebook restore failed.");
				if (result.errors?.length) throw new Error(`Notebook restore imported ${result.imported} and skipped ${result.skipped}; ${result.errors[0]}`);
			}
			if (repairEntries.length || (Array.isArray(collections.repairReminders) && collections.repairReminders.length)) {
				const response = await fetch("/api/repairs/restore", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ repairs: repairEntries, reminders: collections.repairReminders || [], counterValue: collections.repairCounters?.find((counter: any) => counter._id === "mobile-repair-token")?.value }),
				});
				const result = await response.json();
				if (!response.ok) throw new Error(result.error || "Repair restore failed.");
				if (result.errors?.length) throw new Error(`Repair restore imported ${result.imported} and skipped ${result.skipped}; ${result.errors[0]}`);
			}

			for (const [collection, rows] of Object.entries(collections)) {
				if (["notebookEntries", "repairs", "repairCounters", "repairReminders"].includes(collection)) continue;
				for (const row of rows as any[]) {
					const { _id, ...doc } = row;
					await fetch("/api/data", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ collection, ...doc }),
					});
				}
			}

			setMessage("Restore complete. Existing data was kept; backup records were imported.");
		} catch (error: any) {
			setMessage(error.message || "Restore failed.");
		} finally {
			setBusy(false);
			event.target.value = "";
		}
	}

	return <main className="shell">
		<div className="nav"><Link href="/">← Dashboard</Link></div>
		<h1>💾 Backup &amp; Restore</h1>
		<div className="panel">
			<p>MongoDB is the live database. Download a JSON backup regularly and keep a copy in Google Drive/OneDrive.</p>
			<a className="btn" href="/api/backup">⬇ Download Backup Now</a>
			<label className="btn" style={{ marginLeft: 10 }}>
				↩ Restore JSON
				<input hidden type="file" accept=".json" onChange={(event) => void restore(event)} disabled={busy} />
			</label>
			<p className="muted">For automatic cloud backup, connect your own Google Drive/OneDrive account; free quotas and provider limits apply.</p>
			{busy && <p>Restoring...</p>}
			{message && <p role="status">{message}</p>}
		</div>
	</main>;
}
