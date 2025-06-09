let radarChartInstance = null;

export function displayRadarChart(stats, color, maxStatValues) {
  document.querySelector(".chartheight").style.display = "flex";
  const ctx = document.getElementById("myRadarChart").getContext("2d");
  if (radarChartInstance) {
    radarChartInstance.destroy();
  }
  const normalize = (value, max) => (value / max) * 100;
  const hp = normalize(
    stats.find((s) => s.stat.name === "hp").base_stat,
    maxStatValues.hp
  );
  const attack = normalize(
    stats.find((s) => s.stat.name === "attack").base_stat,
    maxStatValues.attack
  );
  const def = normalize(
    stats.find((s) => s.stat.name === "defense").base_stat,
    maxStatValues.defense
  );
  const spatk = normalize(
    stats.find((s) => s.stat.name === "special-attack").base_stat,
    maxStatValues["special-attack"]
  );
  const spdef = normalize(
    stats.find((s) => s.stat.name === "special-defense").base_stat,
    maxStatValues["special-defense"]
  );
  const speed = normalize(
    stats.find((s) => s.stat.name === "speed").base_stat,
    maxStatValues.speed
  );
  radarChartInstance = new Chart(ctx, {
    type: "radar",
    data: {
      labels: ["HP", "Attack", "Defense", "Sp. Atk", "Sp. Def", "Speed"],
      datasets: [
        {
          data: [hp, attack, def, spatk, spdef, speed],
          backgroundColor: color + "40", // add opacity (20%) to hex by appending '33'
          borderColor: color,
          pointBackgroundColor: color,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: false,
        },
      },
      scales: {
        r: {
          pointLabels: {
            color: "#526d82",
          },
          ticks: {
            display: false,
            stepSize: 10,
          },
          suggestedMin: 0,
          suggestedMax: 100,
        },
      },
    },
  });
}
