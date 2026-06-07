import type { Template, TemplateMeta, TemplateRegistry } from '../domain/index.js';
import { API_NEGOTIATION } from './api-negotiation.js';
import { API_NEGOTIATION_VERIFIED } from './api-negotiation-verified.js';
import { CROSS_TEAM_DEBUG } from './cross-team-debug.js';

const ALL_TEMPLATES: Template[] = [API_NEGOTIATION, API_NEGOTIATION_VERIFIED, CROSS_TEAM_DEBUG];

const TEMPLATES = new Map<string, Template>(
  ALL_TEMPLATES.map((template) => [template.id, template]),
);

/** Build the registry of available templates. */
export function createTemplateRegistry(): TemplateRegistry {
  return {
    get: (id) => TEMPLATES.get(id),
    list: () => [...TEMPLATES.values()],
  };
}

/** Project a template down to the public, briefing-facing metadata. */
export function toTemplateMeta(template: Template): TemplateMeta {
  return {
    id: template.id,
    phases: template.phases,
    exit: template.exit,
    roundCap: template.roundCap,
  };
}

export { API_NEGOTIATION };
export { API_NEGOTIATION_VERIFIED };
export { CROSS_TEAM_DEBUG };
