#!/bin/bash
set -e

# Cleanup script to remove committed .next build artifacts from the index and push the cleanup commit.
# Run this locally (in a clone of the repository) to apply the removal on the branch fix/remove-next-and-add-gitignore.

BRANCH=fix/remove-next-and-add-gitignore

git fetch origin
git checkout ${BRANCH}

# Remove .next from index (keeps local files)
git rm -r --cached .next || true

# Ensure .gitignore contains recommended entries
GITIGNORE=.gitignore
grep -q "^\.next$" ${GITIGNORE} || echo ".next" >> ${GITIGNORE}
grep -q "^node_modules/" ${GITIGNORE} || echo "node_modules/" >> ${GITIGNORE}
grep -q "^\.env.local$" ${GITIGNORE} || echo ".env.local" >> ${GITIGNORE}
grep -q "^\.env$" ${GITIGNORE} || echo ".env" >> ${GITIGNORE}
grep -q "^\.env.*.local$" ${GITIGNORE} || echo ".env.*.local" >> ${GITIGNORE}

git add ${GITIGNORE}

# Commit and push
if git diff --staged --quiet; then
  echo "No staged changes to commit."
else
  git commit -m "chore: remove committed .next build artifacts and update .gitignore"
  git push origin ${BRANCH}
fi

echo "Cleanup script finished. If you need history purge (BFG/git-filter-repo), see the repository instructions or ask me to prepare commands."