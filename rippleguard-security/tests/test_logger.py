from rippleguard_security.logger import RippleGuardLogger


logger = RippleGuardLogger()

logger.info("RippleGuard scan started.")
logger.info("Dependency analysis started.")
logger.info("Dependency graph created.")

logger.warning(
    "SQL Injection detected in test_project/app.py"
)

logger.info("Taint analysis completed.")

logger.warning(
    "ZAP detected Cross Site Scripting (Reflected)"
)

logger.info("Risk calculation completed.")
logger.info("RippleGuard scan completed.")

print("Log file:")
print(logger.get_log_file())