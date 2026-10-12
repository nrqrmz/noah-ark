// DEBUG ONLY (remove later): shows the latest master commit (time + title) on the cover,
// so it is clear which version is being played. Also remove #build-info in index.html.
export function showBuildInfo(el) {
  fetch('https://api.github.com/repos/nrqrmz/noah-ark/commits/master')
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.status))))
    .then((c) => {
      const when = new Date(c.commit.committer.date).toLocaleString();
      el.textContent = `${when} · ${c.commit.message.split('\n')[0]}`;
    })
    .catch(() => { el.textContent = 'version: unavailable'; });
}
