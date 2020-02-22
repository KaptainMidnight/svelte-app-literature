<script>
  import Heroes from './components/Heroes.svelte'

  let loading = true;
</script>

{#if loading}
  <Heroes />
{/if}
