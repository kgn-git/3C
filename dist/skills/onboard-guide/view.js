// #22 AC2 — classify roadmap modules as completed / in-progress / upcoming
// from the (#15-reused) Progress record.
export function moduleStatus(roadmap, progress) {
    const completed = [];
    const upcoming = [];
    let inProgress = null;
    for (const m of roadmap) {
        if (progress.completed.includes(m.id))
            completed.push(m.id);
        else if (progress.current === m.id)
            inProgress = m.id;
        else
            upcoming.push(m.id);
    }
    return { completed, inProgress, upcoming };
}
//# sourceMappingURL=view.js.map