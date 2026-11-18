"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { allow, chooseFolder, disable, runNow, status, supported, type BackupStatus } from "@/lib/autoBackup";

export default function Backup() {
	const [message, setMessage] = useState("");
	const [busy, setBusy] = useState(false);
	const [role, setRole] = useState("");
	const [ab, setAb] = useState<BackupStatus | null>(null);
	const [abBusy, setAbBusy] = useState(false);
	const refreshAb = () => { void status().then(setAb).catch(() => {}); };
	useEffect(() => { refreshAb(); window.addEventListener("autobackup:changed", refreshAb); return () => window.removeEventListener("autobackup:changed", refreshAb); }, []);
	async function abDo(fn: () => Promise<any>) { setAbBusy(true); try { const r = await fn(); if (r && r.ok === false) setMessage(r.error || "Backup nahi hua."); else setMessage(""); } catch (e: any) { if (e?.name !== "AbortError") setMessage(e?.message || "Nahi hua."); } finally { setAbBusy(false); refreshAb(); } }
	useEffect(() => { fetch("/api/auth/session", { cache: "no-store" }).then(r => r.json()).then(x => setRole(x?.role || "")).catch(() => {}); }, []);

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
			{role === "ADMIN" ? <a className="btn" href="/api/backup">⬇ Download Backup Now</a> : <p className="muted">Backup download sirf Admin kar sakta hai.</p>}
			<label className="btn" style={{ marginLeft: 10 }}>
				↩ Restore JSON
				<input hidden type="file" accept=".json" onChange={(event) => void restore(event)} disabled={busy} />
			</label>
			<p className="muted">For automatic cloud backup, connect your own Google Drive/OneDrive account; free quotas and provider limits apply.</p>
			{busy && <p>Restoring...</p>}
		</div>
		{role === "ADMIN" && <div className="panel" style={{ marginTop: 14 }}>
			<h2 style={{ marginTop: 0 }}>🕐 Auto Backup (is computer par, har ghante)</h2>
			{!supported() ? <p className="muted">Ye option sirf Chrome ya Edge (computer) mein chalta hai. Is browser mein &quot;Download Backup Now&quot; use karein.</p> : <>
				<p className="muted">Ek bar folder chunein. Phir jab tak POS ka tab khula hai, har ghante backup us folder mein <b>NewArif-Backup-LATEST.json</b> ko update karta rahega, aur har hafte ki ek alag copy (aakhri 8) bhi rakhta hai.</p>
				<p>Halat: <b>{ab?.enabled && ab.folder ? "✅ Chalu" : "⏸ Band"}</b>{ab?.folder ? ` · Folder: ${ab.folder}` : ""}{ab?.last ? ` · Aakhri backup: ${new Date(ab.last).toLocaleString("en-PK")}` : ""}</p>
				{ab?.error && <p role="alert" style={{ color: "#dc2626" }}>⚠ {ab.error}</p>}
				{ab?.enabled && ab.permission !== "granted" && <p className="muted">Browser dobara band/khulne ke baad folder ki ijazat dobara maangta hai: neeche &quot;Ijazat dein&quot; dabayein.</p>}
				<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
					<button type="button" className="btn" disabled={abBusy} onClick={() => void abDo(chooseFolder)}>{ab?.folder ? "📁 Folder badlein" : "📁 Folder chunein aur chalu karein"}</button>
					{ab?.enabled && ab.permission !== "granted" && <button type="button" className="btn" disabled={abBusy} onClick={() => void abDo(allow)}>🔓 Ijazat dein</button>}
					{ab?.folder && ab.permission === "granted" && <button type="button" className="btn" disabled={abBusy} onClick={() => void abDo(runNow)}>⟳ Abhi backup lein</button>}
					{ab?.enabled && <button type="button" className="btn" disabled={abBusy} onClick={() => void abDo(disable)}>⏹ Band karein</button>}
				</div>
				{abBusy && <p>Backup ban raha hai...</p>}
			</>}
		</div>}
		{message && <div className="panel" style={{ marginTop: 14 }}><p role="status">{message}</p></div>}
	</main>;
}
