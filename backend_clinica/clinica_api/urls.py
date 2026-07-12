from django.urls import path

from citas import views


urlpatterns = [
    path("api/health/", views.health),
    path("api/auth/login/", views.login),
    path("api/me/", views.me),
    path("api/catalogo/", views.catalogo),
    path("api/dashboard/", views.dashboard),
    path("api/citas/", views.citas),
    path("api/citas/crear/", views.crear_cita),
    path("api/citas/<int:cita_id>/asistir/", views.marcar_asistido),
    path("api/citas/<int:cita_id>/solicitar-cancelacion/", views.solicitar_cancelacion),
    path("api/citas/<int:cita_id>/aprobar-cancelacion/", views.aprobar_cancelacion),
    path("api/citas/<int:cita_id>/rechazar-cancelacion/", views.rechazar_cancelacion),
]
