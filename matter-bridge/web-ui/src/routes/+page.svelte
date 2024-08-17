<script lang="ts">
	import { onMount } from 'svelte';
	import type { HassEntityLocal } from '@matter-bridge/service/src/home-assistant/HAssTypes';
	let partitionedEntities: {
		[key: string]: HassEntityLocal[];
	} = {};
	let partitions: string[] = [];
	let bridgeStatus: boolean = false;
	async function updateDevices(): Promise<void> {
		const receivedData = await (await fetch('/devices')).json();
		Object.keys(receivedData).forEach((key) => {
			const partition = key.split('.')[0];
			if (!partitionedEntities[partition]) {
				partitions.push(partition);
				partitionedEntities[partition] = [];
			}
			partitionedEntities[partition].push(receivedData[key]);
		});
	}
	async function updateBridgeStatus(): Promise<void> {
		bridgeStatus = (await (await fetch('/bridge')).json())['start'];
	}

	onMount(async () => {
		await updateBridgeStatus();
		await updateDevices();
	});

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
		await updateDevices();
	}
</script>

<div id="bridge">
	{#if bridgeStatus}
		<p>Bridge is running</p>
	{:else}
		<p>Brige is not running</p>
	{/if}
	<button
		on:click={async () => {
			await fetch('/bridge/start', { method: 'POST' });
			await updateBridgeStatus();
		}}>start</button
	>
	<button
		on:click={async () => {
			await fetch('/bridge/stop', { method: 'POST' });
			await updateBridgeStatus();
		}}>stop</button
	>
</div>
<div id="elements">
	{#each Object.keys(partitionedEntities) as partition}
		<div>
			<h3>{partition}</h3>
			{#each partitionedEntities[partition] as entity, index}
				<div>
					<div>
						<label for={entity.id + 'custom_name'}> custom name</label>
						<input
							type="text"
							name={entity.id + 'custom_name'}
							bind:value={partitionedEntities[partition][index]['custom_name']}
						/>
					</div>
					<div>
						<label for={entity.id + 'visible'}> visible </label>
						<input
							type="checkbox"
							name={entity.id + 'visible'}
							bind:value={partitionedEntities[partition][index]['visible']}
						/>
					</div>
					<button
						on:click={() => {
							sendDevice(partition, index);
						}}
					>
						update element
					</button>
				</div>
			{/each}
		</div>
	{/each}
</div>

<style>
	div#elements {
		border: solid red;
		text-align: left;
		width: fit-content;
		margin: auto;
	}
	h3 {
		margin: auto;
		text-align: center;
	}
</style>
