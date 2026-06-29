# Guia para explicar el sistema en la defensa

## Idea general

El sistema organiza las solicitudes de soporte tecnico de la institucion mediante tickets. Cada ticket conserva su estado, prioridad, solicitante, tecnico asignado, comentarios e historial de cambios. La idea principal es mantener trazabilidad: no se pierde informacion de lo que paso con una solicitud.

## Flujo de tickets

1. El usuario registra una solicitud desde el frontend.
2. El backend crea el ticket con estado inicial pendiente.
3. El administrador revisa el caso, define prioridad y asigna un tecnico.
4. El tecnico cambia el estado a en proceso, registra diagnostico y solucion.
5. Cuando el caso termina, el ticket queda finalizado.
6. Cada accion importante queda registrada en el historial.

Archivos principales:

- Backend de tickets: `backend/src/services/ticket.service.ts`
- Controlador de tickets: `backend/src/controllers/ticket.controller.ts`
- Detalle e historial en frontend: `frontend/src/pages/tickets/TicketDetailPage.tsx`
- Estados visibles del ticket: `frontend/src/constants/ticketStatuses.ts`

## Historial del ticket

El historial sirve para saber quien hizo cada cambio, cuando lo hizo y que informacion modifico. Internamente algunos valores se guardan en ingles porque son codigos estables del sistema, por ejemplo `pending` o `critical`. En la pantalla esos valores se traducen a espanol para que el usuario vea "Pendiente" o "Critica".

Esto se maneja en `TicketDetailPage.tsx`, principalmente con:

- `historyActionLabels`: traduce acciones como ticket creado, asignado o resuelto.
- `historyFieldLabels`: traduce campos como estado, prioridad o tecnico asignado.
- `historyValueLabels`: traduce valores tecnicos como pendiente, en proceso, baja, media, alta o critica.
- `formatHistoryDescription`: arma una frase clara para el historial.

## Panel ejecutivo

El panel resume informacion importante del soporte tecnico. Para que sea mas facil de entender, esta dividido en vistas:

- Resumen: muestra lo mas importante para decidir rapido.
- Predictivo: muestra riesgos, equipos criticos y recomendaciones.
- Operacion: muestra origen de incidencias, prioridades y carga tecnica.
- Detalle: muestra tablas y totales completos.

Archivo principal:

- `frontend/src/pages/dashboard/DashboardPage.tsx`

## Analisis predictivo

El analisis predictivo no usa inteligencia artificial ni modelos de machine learning. Funciona con reglas de negocio y datos historicos:

- Cuenta tickets por equipo, usuario, area y tecnico.
- Compara periodos para detectar incrementos.
- Calcula riesgo bajo, medio o alto segun recurrencia.
- Genera recomendaciones automaticas de mantenimiento, capacitacion o revision.

Archivos principales:

- Servicio predictivo: `backend/src/services/predictive-analysis.service.ts`
- Endpoint del panel: `backend/src/controllers/dashboard.controller.ts`
- Consumo en frontend: `frontend/src/services/dashboardApi.ts`
- Tipos usados por frontend: `frontend/src/types/index.ts`

## Por que no se tradujeron todos los nombres tecnicos

Algunos nombres como `createdAt`, `assignedTo`, `TicketStatus` o `DashboardSummary` se mantienen en ingles porque son parte del contrato tecnico entre base de datos, backend y frontend. Cambiarlos obligaria a modificar modelos, consultas, tipos y respuestas de la API, con riesgo de romper el sistema.

Lo importante es que el usuario final vea el sistema en espanol. Por eso se tradujeron etiquetas, mensajes, errores y valores del historial, pero se conservaron los identificadores internos necesarios para que el codigo siga funcionando correctamente.
