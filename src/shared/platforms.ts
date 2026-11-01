export interface TacticalPlatformConfig {
	id: string;
	name: string;
	title: string;
	position: Vector3;
	radius: number;
	buffType: "heal" | "damage" | "cooldown";
	buffName: string;
	buffDesc: string;
	color: Color3;
}

export const TACTICAL_PLATFORMS: TacticalPlatformConfig[] = [
	{
		id: "heal_sanctuary",
		name: "Santuario de Salud",
		title: "BASTIÓN NORTE",
		position: new Vector3(0, 0.2, 45),
		radius: 12,
		buffType: "heal",
		buffName: "Regeneración Vital",
		buffDesc: "+8 HP por segundo",
		color: new Color3(0.1, 0.9, 0.4), // Verde esmeralda
	},
	{
		id: "damage_overload",
		name: "Pilar de Sobrecarga",
		title: "BASTIÓN SUROESTE",
		position: new Vector3(-55, 0.2, -35),
		radius: 12,
		buffType: "damage",
		buffName: "Sobrecarga de Plasma",
		buffDesc: "+50% de Daño en todas las armas",
		color: new Color3(1.0, 0.25, 0.15), // Rojo anaranjado
	},
	{
		id: "haste_vortex",
		name: "Vórtice Acelerador",
		title: "BASTIÓN SURESTE",
		position: new Vector3(55, 0.2, -35),
		radius: 12,
		buffType: "cooldown",
		buffName: "Hipercronía",
		buffDesc: "-40% de Cooldown en ataques",
		color: new Color3(0.1, 0.8, 1.0), // Cian eléctrico
	},
];
