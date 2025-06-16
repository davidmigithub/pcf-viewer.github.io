import { MeshStandardMaterial, Color } from './vendor_mods/three.module.js';

// COMPONENT ACCURACY
export const GEOMETRY_SEGMENTS = 32;

// COMPONENT COLOR
export const BEND_MATERIAL =                    new MeshStandardMaterial({ color: 0x6ba836, transparent: true, opacity: 1.0 });
export const CAP_MATERIAL =                     new MeshStandardMaterial({ color: 0x397327, transparent: true, opacity: 1.0 });
export const COUPLING_MATERIAL =                new MeshStandardMaterial({ color: 0x666666, transparent: true, opacity: 1.0 });
export const FLANGE_MATERIAL =                  new MeshStandardMaterial({ color: 0xe69317, transparent: true, opacity: 1.0 });
export const INSTRUMENT_MATERIAL =              new MeshStandardMaterial({ color: 0x00ffff, transparent: true, opacity: 1.0 });
export const MICCOMPONENT_MATERIAL =            new MeshStandardMaterial({ color: 0xff0000, transparent: true, opacity: 1.0 });
export const OLET_MATERIAL =                    new MeshStandardMaterial({ color: 0xa82597, transparent: true, opacity: 1.0 });
export const PIPE_MATERIAL =                    new MeshStandardMaterial({ color: 0x345eeb, transparent: true, opacity: 1.0 });
export const PIPEFIXED_MATERIAL =               new MeshStandardMaterial({ color: 0x000000, transparent: true, opacity: 1.0 });
export const REDUCERCONC_MATERIAL =             new MeshStandardMaterial({ color: 0x11a6a8, transparent: true, opacity: 1.0 });
export const REDUCERECC_MATERIAL =              new MeshStandardMaterial({ color: 0x11a6a8, transparent: true, opacity: 1.0 });
export const SUPPORTANCH_MATERIAL =             new MeshStandardMaterial({ color: 0xff0000, transparent: true, opacity: 1.0 });
export const SUPPORTHANG_MATERIAL =             new MeshStandardMaterial({ color: 0x00ff00, transparent: true, opacity: 1.0 });
export const SUPPORTSKID_MATERIAL =             new MeshStandardMaterial({ color: 0x00ff00, transparent: true, opacity: 1.0 });
export const TEE_MATERIAL =                     new MeshStandardMaterial({ color: 0x2d8a87, transparent: true, opacity: 1.0 });
export const VALVE_MATERIAL =                   new MeshStandardMaterial({ color: 0xebbd34, transparent: true, opacity: 1.0 });
export const VALVEANGLE_MATERIAL =              new MeshStandardMaterial({ color: 0xffff00, transparent: true, opacity: 1.0 });
export const PLACEHOLDER_MATERIAL =             new MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
export const WELD_MATERIAL =                    new MeshStandardMaterial({ color: 0xff0000, transparent: true, opacity: 1.0 });

// SCENE COLORS
export const SCENEBACKGROUND =                  new Color(0x151515);
export const HIGHLIGHT_COLOR    =               new Color(0xfc2828);
export const HIGHLIGHT_EMISSIVE =               new Color(0x700985);
export const HIGHLIGHT_EMISSIVE_INTENSITY =     1.0;
export const HIGHLIGHT_OPACITY =                0.8;

// LIGHT SETTINGS
export const HEMI_LIGHT_SKY_COLOR = 0xffffff;
export const HEMI_LIGHT_GROUND_COLOR = 0x555555;
export const HEMI_LIGHT_INTENSITY = 8;

// VIEW HELPER
export const VIEW_HELPER_POSITION = 'top-right';