<script lang="ts">
	import ArrowsRotateSolid from 'svelte-awesome-icons/ArrowsRotateSolid.svelte';
	import { onMount } from 'svelte';
	import Switch from '$lib/switch.svelte';
	import type { HassEntityLocal } from '@matter-bridge/service/src/home-assistant/HAssTypes';
	let allEntities: { [key: string]: HassEntityLocal } = {};
	let partitionedEntities: {
		[key: string]: HassEntityLocal[];
	} = {};
	let partitions: string[] = [];
	let bridgeStatus: boolean = false;
	async function updateAllEntities(): Promise<void> {
		allEntities = (await (await fetch('/devices')).json()) as {
			[key: string]: HassEntityLocal;
		};
	}

	async function updateDevices(): Promise<void> {
		partitionedEntities = {};
		partitions = [];
		Object.keys(allEntities).forEach((key: string) => {
			const partition = key.split('.')[0];
			if (!partitionedEntities[partition]) {
				partitions.push(partition);
				partitionedEntities[partition] = [];
			}
			partitionedEntities[partition].push(allEntities[key]);
		});
	}
	async function updateBridgeStatus(): Promise<void> {
		bridgeStatus = (await (await fetch('/bridge')).json())['start'];
	}

	async function sendDevice(partition: string, index: number) {
		const element = partitionedEntities[partition][index];
		const response = await fetch(`/devices/${element.id}`, {
			method: 'POST',
			body: JSON.stringify(element),
			headers: {
				'Content-Type': 'application/json'
			}
		});
		console.log({ element });
		console.log(await response.json());
		await updateAllEntities();
	}

	onMount(async () => {
		await updateBridgeStatus();
		await updateAllEntities();
	});
	$: if (allEntities) {
		updateDevices();
	}
	$: if (partitions) {
		console.log('robe');
	}
	$: if (bridgeStatus) {
		console.log({ bridgeStatus });
	}
</script>

<div class="container">
	<div class="header card" id="bridge">
		<button
			class="update_button"
			on:click={async () => {
				await updateAllEntities();
				await updateBridgeStatus();
			}}
		>
			<ArrowsRotateSolid />
		</button>
		<div class="classes">
			{#each partitions as partition}
				<a href={`#${partition}`} class="hpartiotion card">{partition}</a>
			{/each}
		</div>

		<div class="bridge_status">
			<Switch
				bind:status={bridgeStatus}
				onChangeFunction={async () => {
					if (bridgeStatus) {
						await fetch('/bridge/start', { method: 'POST' });
					} else {
						await fetch('/bridge/stop', { method: 'POST' });
					}
					await updateBridgeStatus();
				}}
			/>
		</div>
	</div>
	<div>
		{#each partitions as partition}
			<h3>{partition}</h3>
			<div class="partition" id={partition}>
				{#each partitionedEntities[partition] as entity, index}
					<div class="element card">
						<div class="custom_name">
							<label for={entity.id + 'custom_name'}> custom name</label>
							<input
								type="text"
								name={entity.id + 'custom_name'}
								bind:value={partitionedEntities[partition][index]['custom_name']}
								on:change={() => {
									sendDevice(partition, index);
								}}
							/>
						</div>
						<div class="check_visibility">
							<div>visible</div>
							<Switch
								bind:status={partitionedEntities[partition][index].visible}
								onChangeFunction={async () => {
									await sendDevice(partition, index);
								}}
							/>
						</div>
					</div>
				{/each}
			</div>
		{/each}
	</div>
</div>

<style lang="css">
	:root {
		color-scheme: light dark;
	}
	a,
	a:visited,
	a:focus,
	a:hover {
		color: inherit;
		text-decoration: none;
		font-size: 15px;
		cursor: pointer;
	}

	h3 {
		font-size: 25px;
		text-transform: capitalize;
	}
	.container {
		width: 95%;
		max-width: 1333px;
		margin: auto;
	}
	.header {
		margin: auto;
		display: flex;
		padding: 0.5em;
		flex-direction: row;
	}
	.classes {
		display: inline-grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		width: 100%;
		margin: auto;
		padding: 2vw;
		gap: 1vw;
	}
	.hpartiotion {
		outline: 1px solid black;
		text-align: center;
		padding: 1em;
	}

	.update_button {
		height: fit-content;
		width: auto;
		margin: auto;
		background: none;
		border: none;
	}

	.bridge_status {
		width: auto;
		margin: auto;
	}

	.partition {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 25px;
	}
	.element {
		justify-content: center;
		padding: 1em;
	}
	.custom_name {
		justify-self: stretch;
		margin-bottom: 0;
		display: flex;
		text-align: left;
		flex-direction: column;
	}

	.custom_name > label {
		display: none;
	}

	.custom_name > input {
		border-left: none;
		border-right: none;
		border-top: none;
		border-bottom: 1px solid black;
		height: 20px;
		font-size: 15px;
	}
	.check_visibility {
		align-items: center;
		display: flex;
		justify-content: space-between;
	}

	.element > div {
		margin-top: 1em;
	}
	.card {
		box-sizing: border-box;
		border-style: solid;
		border-radius: 12px;
	}
</style>
