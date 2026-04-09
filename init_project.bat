@echo off
mkdir old
move *.html old
move *.css old
move *.pdf old
call npx --yes create-next-app@latest . --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm --yes
