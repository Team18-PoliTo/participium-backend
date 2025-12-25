/**
 * Defines how report data should be presented depending on the requester.
 *
 * - CITIZEN: authenticated citizen view.
 *   Anonymous reports hide real citizen data (name, last name, id)
 *   and return "Anonymous" instead.
 *
 * - INTERNAL: internal users (officers, staff).
 *   Real citizen data is always visible, regardless of anonymity flag.
 *
 * This enum is used only for presentation logic (mappers),
 * not for authorization or access control.
 */
export enum ReportViewContext {
  CITIZEN = "CITIZEN",
  INTERNAL = "INTERNAL",
}
