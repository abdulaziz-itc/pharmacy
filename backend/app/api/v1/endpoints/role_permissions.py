from typing import Any, Dict, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from pydantic import BaseModel

from app.api import deps
from app.models.user import User, UserRole, RolePermission

router = APIRouter()

# All available sections with their Russian labels
AVAILABLE_SECTIONS = [
    {"key": "dashboard", "label": "Дашборд"},
    {"key": "bonuses", "label": "Бонусы МП"},
    {"key": "salaries", "label": "Зарплата МП"},
    {"key": "reports", "label": "Расширенные отчеты"},
    {"key": "deputy_directors", "label": "Зам. Директора"},
    {"key": "head_of_orders_mgmt", "label": "Менеджеры по закупкам"},
    {"key": "warehouse_users", "label": "Зав. складом"},
    {"key": "product_managers_team", "label": "Моя команда (ПМ)"},
    {"key": "product_managers", "label": "Менеджеры продукта"},
    {"key": "med_reps", "label": "Мед представители"},
    {"key": "products", "label": "Продукты"},
    {"key": "regions", "label": "Регионы"},
    {"key": "med_orgs", "label": "Организации"},
    {"key": "manufacturers", "label": "Производители"},
    {"key": "doctors", "label": "Врачи"},
    {"key": "reservations", "label": "Брони"},
    {"key": "invoices", "label": "Фактура"},
    {"key": "debtors", "label": "Дебиторка"},
    {"key": "payments", "label": "Платежи"},
    {"key": "stats", "label": "Статистика"},
    {"key": "audit", "label": "Журнал аудита"},
    {"key": "warehouse", "label": "Склады"},
    {"key": "deletion_approval", "label": "Удаление (План)"},
    {"key": "hrd", "label": "Директор отдела кадров"},
    {"key": "login_history", "label": "История входов"},
    {"key": "head_of_orders_manufacturers", "label": "Произв. компании (ЗЗ)"},
    {"key": "head_of_orders_reservations", "label": "Брони (ЗЗ)"},
    {"key": "head_of_orders_invoices", "label": "Фактура (ЗЗ)"},
    {"key": "head_of_orders_debitorka", "label": "Дебиторка (ЗЗ)"},
    {"key": "head_of_orders_wholesale", "label": "Оптовые компании (ЗЗ)"},
    {"key": "head_of_orders_reports", "label": "Отчеты (ЗЗ)"},
    {"key": "accountant", "label": "Бухгалтерия"},
    {"key": "finance", "label": "Финансы"},
    {"key": "kreditorka", "label": "Кредиторка"},
    {"key": "counterparty_balance", "label": "Баланс контрагентов"},
]

# Default permissions (based on current hardcoded sidebar)
DEFAULT_PERMISSIONS: Dict[str, List[str]] = {
    "dashboard": ["admin", "investor", "director", "deputy_director", "product_manager", "field_force_manager", "regional_manager", "med_rep", "head_of_orders", "head_of_warehouse", "hrd"],
    "bonuses": ["admin", "investor", "director", "deputy_director"],
    "salaries": ["admin", "investor", "director", "deputy_director", "hrd"],
    "reports": ["admin", "investor", "director", "deputy_director", "product_manager", "field_force_manager", "regional_manager", "hrd", "accountant"],
    "deputy_directors": ["admin", "investor", "director"],
    "head_of_orders_mgmt": ["admin", "investor", "director"],
    "warehouse_users": ["admin", "investor", "director"],
    "product_managers_team": ["product_manager"],
    "product_managers": ["admin", "investor", "director", "deputy_director"],
    "med_reps": ["admin", "investor", "director", "deputy_director", "product_manager", "field_force_manager", "regional_manager", "hrd"],
    "products": ["admin", "investor", "director", "deputy_director", "product_manager", "med_rep", "hrd"],
    "regions": ["admin", "investor", "director", "deputy_director", "product_manager", "field_force_manager", "regional_manager", "hrd"],
    "med_orgs": ["admin", "investor", "director", "deputy_director", "product_manager", "field_force_manager", "regional_manager", "hrd"],
    "manufacturers": ["admin", "investor", "director", "deputy_director"],
    "doctors": ["admin", "investor", "director", "deputy_director", "product_manager", "field_force_manager", "regional_manager", "med_rep", "hrd"],
    "reservations": ["admin", "investor", "director", "deputy_director", "med_rep", "product_manager", "field_force_manager", "regional_manager", "hrd"],
    "invoices": ["admin", "investor", "director", "deputy_director", "med_rep", "product_manager", "field_force_manager", "regional_manager", "hrd"],
    "debtors": ["admin", "investor", "director", "deputy_director", "med_rep", "product_manager", "field_force_manager", "regional_manager", "hrd"],
    "payments": ["admin", "investor", "director", "deputy_director"],
    "stats": ["admin", "investor", "director", "deputy_director", "hrd", "product_manager", "field_force_manager", "regional_manager", "accountant"],
    "audit": ["admin", "investor", "director", "deputy_director"],
    "warehouse": ["admin", "investor", "director", "deputy_director", "head_of_warehouse"],
    "deletion_approval": ["admin", "investor", "director", "head_of_warehouse"],
    "hrd": ["director", "investor", "hrd"],
    "login_history": ["investor", "director", "hrd"],
    "head_of_orders_manufacturers": ["head_of_orders"],
    "head_of_orders_reservations": ["head_of_orders"],
    "head_of_orders_invoices": ["head_of_orders"],
    "head_of_orders_debitorka": ["head_of_orders"],
    "head_of_orders_wholesale": ["head_of_orders"],
    "head_of_orders_reports": ["head_of_orders"],
    "accountant": ["admin", "investor", "director", "accountant"],
    "finance": ["admin", "investor", "director", "accountant"],
    "kreditorka": ["admin", "investor", "director", "accountant"],
    "counterparty_balance": ["admin", "investor", "director", "accountant"],
}

# Roles that can be managed (investor excluded)
MANAGEABLE_ROLES = [
    {"key": "admin", "label": "Администратор"},
    {"key": "director", "label": "Директор"},
    {"key": "deputy_director", "label": "Зам. Директора"},
    {"key": "hrd", "label": "Отдел кадров"},
    {"key": "head_of_orders", "label": "Зав. заказами"},
    {"key": "head_of_warehouse", "label": "Зав. складом"},
    {"key": "product_manager", "label": "Менеджер продукта"},
    {"key": "field_force_manager", "label": "Полевой менеджер"},
    {"key": "regional_manager", "label": "Региональный менеджер"},
    {"key": "med_rep", "label": "Мед. представитель"},
    {"key": "accountant", "label": "Бухгалтер"},
]


class PermissionUpdate(BaseModel):
    role: str
    section_key: str
    is_enabled: bool


class BulkPermissionUpdate(BaseModel):
    permissions: List[PermissionUpdate]


async def seed_defaults_if_empty(db: AsyncSession):
    """Seed default permissions if the table is empty."""
    result = await db.execute(select(RolePermission).limit(1))
    if result.scalars().first() is not None:
        return  # Already seeded

    for section_key, roles in DEFAULT_PERMISSIONS.items():
        for role_info in MANAGEABLE_ROLES:
            role = role_info["key"]
            is_enabled = role in roles
            db.add(RolePermission(
                role=role,
                section_key=section_key,
                is_enabled=is_enabled,
            ))
    await db.commit()


@router.get("/role-permissions")
async def get_all_permissions(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Get all role permissions matrix. Only investor/admin/director."""
    if current_user.role not in [UserRole.INVESTOR, UserRole.ADMIN, UserRole.DIRECTOR]:
        raise HTTPException(status_code=403, detail="Недостаточно прав")

    await seed_defaults_if_empty(db)

    result = await db.execute(select(RolePermission))
    all_perms = result.scalars().all()

    # Build matrix: { role: { section_key: is_enabled } }
    matrix = {}
    for perm in all_perms:
        if perm.role not in matrix:
            matrix[perm.role] = {}
        matrix[perm.role][perm.section_key] = perm.is_enabled

    return {
        "sections": AVAILABLE_SECTIONS,
        "roles": MANAGEABLE_ROLES,
        "permissions": matrix,
    }


@router.put("/role-permissions")
async def update_permissions(
    data: BulkPermissionUpdate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Update role permissions. Only investor/admin/director."""
    if current_user.role not in [UserRole.INVESTOR, UserRole.ADMIN, UserRole.DIRECTOR]:
        raise HTTPException(status_code=403, detail="Недостаточно прав")

    for perm in data.permissions:
        # Find existing
        result = await db.execute(
            select(RolePermission).where(
                RolePermission.role == perm.role,
                RolePermission.section_key == perm.section_key,
            )
        )
        existing = result.scalars().first()
        if existing:
            existing.is_enabled = perm.is_enabled
        else:
            db.add(RolePermission(
                role=perm.role,
                section_key=perm.section_key,
                is_enabled=perm.is_enabled,
            ))

    await db.commit()
    return {"ok": True, "message": "Права успешно обновлены"}


@router.get("/role-permissions/my")
async def get_my_permissions(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Get enabled section keys for the current user's role."""
    user_role = str(current_user.role) if current_user.role else ""

    # Investor always sees everything
    if user_role == UserRole.INVESTOR.value or user_role == UserRole.INVESTOR:
        return {"sections": [s["key"] for s in AVAILABLE_SECTIONS]}

    await seed_defaults_if_empty(db)

    result = await db.execute(
        select(RolePermission).where(
            RolePermission.role == user_role,
            RolePermission.is_enabled == True,
        )
    )
    perms = result.scalars().all()
    enabled_keys = [p.section_key for p in perms]

    # If DB has no permissions for this role, use hardcoded defaults as a second-level fallback
    if not enabled_keys:
        for section_key, roles in DEFAULT_PERMISSIONS.items():
            if user_role in roles:
                enabled_keys.append(section_key)

    # Temporary hardcoded fallback for accountant and hrd to ensure it works on production immediately
    if user_role in [UserRole.ACCOUNTANT.value, "accountant"]:
        essential = ["accountant", "finance", "dashboard", "reports", "stats", "invoices", "payments", "debtors", "kreditorka", "counterparty_balance"]
        for key in essential:
            if key not in enabled_keys:
                enabled_keys.append(key)
    
    if user_role in [UserRole.HRD.value, "hrd"]:
        essential = ["hrd", "login_history", "dashboard", "reports", "stats", "doctors", "reservations", "invoices", "debtors", "med_reps", "products", "regions", "med_orgs", "salaries"]
        for key in essential:
            if key not in enabled_keys:
                enabled_keys.append(key)

    if user_role in [UserRole.DIRECTOR.value, "director"]:
        essential = ["salaries", "bonuses", "reports", "stats", "hrd", "login_history"]
        for key in essential:
            if key not in enabled_keys:
                enabled_keys.append(key)

    if user_role in [UserRole.DEPUTY_DIRECTOR.value, "deputy_director"]:
        essential = ["salaries", "bonuses", "reports", "stats"]
        for key in essential:
            if key not in enabled_keys:
                enabled_keys.append(key)

    # Manager fallbacks for reports/stats
    if user_role in [UserRole.REGIONAL_MANAGER.value, UserRole.FIELD_FORCE_MANAGER.value, UserRole.PRODUCT_MANAGER.value, "regional_manager", "field_force_manager", "product_manager"]:
        essential = ["reports", "stats", "regions", "med_orgs", "doctors", "products", "kreditorka", "counterparty_balance"]
        for key in essential:
            if key not in enabled_keys:
                enabled_keys.append(key)

    return {"sections": list(set(enabled_keys))}
