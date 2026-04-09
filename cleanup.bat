@echo off
mkdir backup_old
move *.* backup_old
move backup_old\cleanup.bat .
@echo Cleanup done. Ready for npx.
