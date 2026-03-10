from fastapi import APIRouter
from app.api.v1.endpoints import (
    login, users, products, references, crm, 
    sales, finance, user_hierarchy, visits, 
    visit_plans, notifications, dashboard
)

api_router = APIRouter()
api_router.include_router(login.router, tags=["login"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(user_hierarchy.router, prefix="/users", tags=["users"])
api_router.include_router(visits.router, prefix="/users", tags=["visits"])
api_router.include_router(products.router, prefix="/products", tags=["products"])
api_router.include_router(references.router, tags=["references"])
api_router.include_router(crm.router, prefix="/crm", tags=["crm"])
api_router.include_router(sales.router, prefix="/sales", tags=["sales"])
api_router.include_router(finance.router, prefix="/finance", tags=["finance"])
api_router.include_router(visit_plans.router, prefix="/visit-plans", tags=["visit-plans"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])

from app.api.v1.endpoints import (
    orders, analytics, users_domain, reports, audit,
    head_of_orders, medrep_sales, pharmacy_stocks
)

api_router.include_router(orders.router, prefix="/domain/orders", tags=["domain_orders"])
api_router.include_router(analytics.router, prefix="/domain/analytics", tags=["domain_analytics"])
api_router.include_router(reports.router, prefix="/domain/analytics/reports", tags=["domain_reports"])
api_router.include_router(users_domain.router, prefix="/domain/users", tags=["domain_users"])
api_router.include_router(audit.router, prefix="/audit", tags=["audit"])
api_router.include_router(head_of_orders.router, prefix="/domain/orders/management", tags=["head_of_orders"])
api_router.include_router(medrep_sales.router, prefix="/sales/medrep", tags=["medrep_sales"])
api_router.include_router(pharmacy_stocks.router, prefix="/domain/crm/pharmacy-stocks", tags=["pharmacy_stocks"])
