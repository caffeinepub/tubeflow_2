import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Preference {
    playbackSpeed: number;
    accentColor: string;
    apiKey: string;
}
export interface backendInterface {
    createPreference(apiKey: string, accentColor: string, playbackSpeed: number): Promise<void>;
    deletePreference(): Promise<void>;
    getAllPreferences(): Promise<Array<Preference>>;
    getPreference(): Promise<Preference | null>;
    updatePreference(apiKey: string, accentColor: string, playbackSpeed: number): Promise<void>;
}
