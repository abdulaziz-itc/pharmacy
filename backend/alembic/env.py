from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

import sys
from os.path import abspath, dirname
sys.path.insert(0, dirname(dirname(abspath(__file__))))

# add your model's MetaData object here
# for 'autogenerate' support
from app.db.base import Base
target_metadata = Base.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.

from app.core.config import settings
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = settings.DATABASE_URL
    if url:
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgresql://") and not url.startswith("postgresql+asyncpg://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=target_metadata)

    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    configuration = config.get_section(config.config_ini_section)
    url = settings.DATABASE_URL
    if url:
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgresql://") and not url.startswith("postgresql+asyncpg://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        
    configuration["sqlalchemy.url"] = url
    connectable = create_async_engine(url)

    async with connectable.connect() as connection:
        # --- RESEARCH TX #427 ---
        from sqlalchemy import text
        res = await connection.execute(text("SELECT id, state_before, state_after FROM audit_log WHERE target_id = 427 AND target_type = 'BalanceTransaction'"))
        rows = res.mappings().all()
        print("\n=== RESEARCH TX #427 RESULTS ===")
        for r in rows:
            print(f"ID: {r['id']}, BEFORE: {r['state_before']}, AFTER: {r['state_after']}")
        
        p_res = await connection.execute(text("SELECT * FROM payment WHERE created_at >= '2026-04-21 17:10:00' AND created_at <= '2026-04-21 17:30:00'"))
        for p in p_res.mappings().all():
            print(f"POTENTIAL PAYMENT: {dict(p)}")
            
        b_res = await connection.execute(text("SELECT * FROM bonusledger WHERE created_at >= '2026-04-21 17:10:00' AND created_at <= '2026-04-21 17:30:00'"))
        for b in b_res.mappings().all():
            print(f"POTENTIAL BONUS: {dict(b)}")
        print("=== END RESEARCH ===\n")
        # ------------------------
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
