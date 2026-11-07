/**
 * MutaSelect AI - Robust Local Storage State Persistence
 * Ensures projects, configurations, and experiment executions
 * persist across page refreshes without cross-contamination.
 */

import { Project, Experiment } from '../types';

const STORAGE_KEYS = {
  PROJECTS: 'mutaselect_v2_projects',
  ACTIVE_PROJECT_ID: 'mutaselect_v2_active_project_id',
  EXPERIMENTS: 'mutaselect_v2_experiments',
  DEMO_MODE: 'mutaselect_v2_demo_mode',
  BACKEND_URL: 'mutaselect_v2_backend_url',
  TARGET_RETENTION: 'mutaselect_v2_target_retention'
};

export function loadSavedProjects(): Project[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROJECTS);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch (err) {
    console.warn('Failed to load saved projects from localStorage:', err);
    return null;
  }
}

export function saveProjects(projects: Project[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
  } catch (err) {
    console.warn('Failed to save projects to localStorage:', err);
  }
}

export function loadActiveProjectId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_PROJECT_ID);
  } catch {
    return null;
  }
}

export function saveActiveProjectId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_PROJECT_ID, id);
  } catch {}
}

export function loadSavedExperiments(): Experiment[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EXPERIMENTS);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch (err) {
    console.warn('Failed to load saved experiments from localStorage:', err);
    return null;
  }
}

export function saveExperiments(experiments: Experiment[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.EXPERIMENTS, JSON.stringify(experiments));
  } catch (err) {
    console.warn('Failed to save experiments to localStorage:', err);
  }
}

export function loadSavedDemoMode(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DEMO_MODE);
    if (raw === null) return false; // Default to Live Execution, not Demo Mode!
    return raw === 'true';
  } catch {
    return false;
  }
}

export function saveDemoMode(isDemo: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEYS.DEMO_MODE, isDemo ? 'true' : 'false');
  } catch {}
}

export function loadSavedRetention(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TARGET_RETENTION);
    if (!raw) return 95;
    const parsed = parseFloat(raw);
    return isNaN(parsed) ? 95 : parsed;
  } catch {
    return 95;
  }
}

export function saveRetention(val: number): void {
  try {
    localStorage.setItem(STORAGE_KEYS.TARGET_RETENTION, val.toString());
  } catch {}
}
