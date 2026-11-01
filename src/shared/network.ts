export interface DamagePayload {
	enemyId: string;
	damage: number;
	knockbackDir?: Vector3;
}

export interface EnemyDeathPayload {
	enemyId: string;
	position: Vector3;
	expValue: number;
}
