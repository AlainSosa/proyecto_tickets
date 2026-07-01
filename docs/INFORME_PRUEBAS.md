# Informe de Pruebas del Sistema

Proyecto: Sistema de Tickets y Soporte Informatico
Fecha de ejecucion: 2026-07-01

## Alcance

Se realizaron pruebas de caja blanca y caja negra sobre los modulos principales del sistema:

- Autenticacion y control de acceso por roles.
- Gestion de tickets.
- Subida de evidencias o adjuntos.
- Gestion de usuarios.
- Gestion de activos.
- Gestion de mantenimiento.
- Reportes, auditoria e internacionalizacion.

## Herramientas de Verificacion

| Area | Comando | Resultado |
| --- | --- | --- |
| Frontend | `npm run build` | Aprobado |
| Frontend | `npm test` | Aprobado, ejecuta compilacion completa |
| Backend | `npm run build` | Aprobado |
| Backend | `npm run typecheck` | Aprobado |
| Backend | `npm test` | Aprobado, ejecuta typecheck y build |

Nota: el proyecto tiene scripts `lint`, pero ESLint no esta instalado/configurado en las dependencias actuales. Por eso no se considera evidencia valida de prueba hasta instalar y configurar ESLint.

## Pruebas de Caja Blanca

Las pruebas de caja blanca se realizaron revisando la estructura interna del codigo, validaciones, rutas, permisos, modelos y servicios.

| ID | Componente | Validacion interna | Resultado |
| --- | --- | --- | --- |
| CB-01 | Autenticacion | El login solo permite usuarios activos mediante `isActive: true`. | Aprobado |
| CB-02 | Middleware de permisos | Las rutas usan `authenticate` y `authorize` segun rol. | Aprobado |
| CB-03 | Usuarios | El administrador puede actualizar `isActive`; backend lo valida con Zod. | Aprobado |
| CB-04 | Tickets | La creacion acepta adjuntos con `multipart/form-data`. | Aprobado |
| CB-05 | Adjuntos | Multer limita a 5 archivos y 10 MB por archivo. | Aprobado |
| CB-06 | Validacion de tickets | Los adjuntos aceptan URLs validas o archivos servidos desde `/api/uploads`. | Aprobado |
| CB-07 | Mantenimiento | La relacion `Maintenance -> Asset` usa alias `asset`. | Aprobado |
| CB-08 | Mantenimiento | La consulta incluye equipo y tecnico relacionado. | Aprobado |
| CB-09 | Busqueda de mantenimiento | Permite buscar por observacion, codigo, marca o modelo del activo. | Aprobado |
| CB-10 | Internacionalizacion | Los textos nuevos usan el sistema `t(...)` en espanol/portugues. | Aprobado |

## Pruebas de Caja Negra

Las pruebas de caja negra se definieron desde el comportamiento esperado del usuario, sin depender del codigo interno.

| ID | Escenario | Entrada / Accion | Resultado esperado | Estado |
| --- | --- | --- | --- | --- |
| CN-01 | Login valido | Usuario activo con credenciales correctas | Ingresa al sistema segun su rol | Aprobado |
| CN-02 | Login de usuario inactivo | Usuario desactivado | El sistema no permite acceso | Aprobado por revision funcional |
| CN-03 | Crear ticket usuario final | Titulo, descripcion y area | Ticket registrado correctamente | Aprobado |
| CN-04 | Adjuntar evidencias | Seleccionar hasta 5 archivos | Se muestran en lista y se envian al backend | Aprobado |
| CN-05 | Exceder adjuntos | Seleccionar mas de 5 archivos | El sistema muestra mensaje de limite | Aprobado |
| CN-06 | Ver detalle de ticket | Abrir ticket con adjuntos | Se listan evidencias disponibles | Aprobado |
| CN-07 | Editar usuario admin | Cambiar nombre, rol, area y estado | Usuario actualizado correctamente | Aprobado |
| CN-08 | Desactivar usuario | Cambiar estado a inactivo | Usuario queda inhabilitado para login | Aprobado |
| CN-09 | Listar mantenimiento | Abrir modulo mantenimiento | Columna Equipo muestra codigo, tipo, marca y modelo | Aprobado |
| CN-10 | Crear mantenimiento | Seleccionar equipo real de la lista | Registro queda asociado al activo seleccionado | Aprobado |
| CN-11 | Cambiar idioma | Click en boton de idioma | Textos nuevos cambian ES/PT | Aprobado |
| CN-12 | Reportes rapidos | Generar vista/impresion | Se genera reporte con datos visibles | Aprobado |

## Evidencia Tecnica Ejecutada

Comandos ejecutados correctamente:

```bash
cd frontend
npm run build
npm test

cd ../backend
npm run typecheck
npm run build
npm test
```

## Que Puedes Decir en la Presentacion

Puedes decir:

"Se realizaron pruebas de caja blanca mediante revision de rutas, servicios, validaciones, modelos, permisos y compilacion TypeScript del sistema. Tambien se realizaron pruebas de caja negra sobre los flujos principales: autenticacion, gestion de tickets, subida de evidencias, gestion de usuarios, mantenimiento, reportes y cambio de idioma. Los comandos de verificacion del frontend y backend finalizaron correctamente."

## Que No Conviene Decir

No conviene decir que existen pruebas unitarias automatizadas, pruebas E2E automatizadas o cobertura porcentual de codigo, porque el proyecto actualmente no tiene configurado un framework como Vitest, Jest, Supertest o Playwright.

## Recomendacion Final

Para una defensa de proyecto de grado, el estado actual es defendible como pruebas funcionales, pruebas de validacion tecnica y pruebas de caja blanca/caja negra documentadas.

Si el tribunal exige automatizacion avanzada, el siguiente paso seria instalar y configurar:

- Vitest para pruebas unitarias del frontend.
- Supertest o Vitest para endpoints del backend.
- Playwright para pruebas end-to-end en navegador.
- ESLint para analisis estatico formal.
