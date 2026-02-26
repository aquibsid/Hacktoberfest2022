// SELECT ALL ELEMENTS
const country_name_element = document.querySelector(".country .name");
const total_cases_element = document.querySelector(".total-cases .value");
const new_cases_element = document.querySelector(".total-cases .new-value");
const recovered_element = document.querySelector(".recovered .value");
const new_recovered_element = document.querySelector(".recovered .new-value");
const deaths_element = document.querySelector(".deaths .value");
const new_deaths_element = document.querySelector(".deaths .new-value");
const chartElement = document.getElementById("axes_line_chart");
const barChartElement = document.getElementById("bar_chart");
const refreshButton = document.getElementById("refresh-data");
const toggleThemeButton = document.getElementById("toggle-theme");
const lastUpdatedElement = document.getElementById("last-updated");
const loadingIndicator = document.getElementById("loading-indicator");
const searchInput = document.getElementById("search-input");
const searchCountryContainer = document.querySelector(".search-country");

const ctx = chartElement ? chartElement.getContext("2d") : null;

function isLightThemeEnabled() {
  return document.body.classList.contains("light-theme");
}

function getChartTextColor() {
  return isLightThemeEnabled() ? "#1d1d1d" : "#ffffff";
}

// APP VARIABLES
let cases_list = [];
let recovered_list = [];
let deaths_list = [];
let dates = [];
let formatedDates = [];

// Prevent runtime errors on pages that do not have dashboard canvases.
if (ctx && barChartElement) {
  initializeDashboard();
}

function initializeDashboard() {
  // GET USERS COUNTRY CODE
  let country_code = geoplugin_countryCode();
  let user_country = "India";

  country_list.forEach((country) => {
    if (country.code === country_code) {
      user_country = country.name;
    }
  });

  fetchData(user_country);
  setupInteractiveControls();

  function setupInteractiveControls() {
    if (refreshButton) {
      refreshButton.addEventListener("click", () => fetchData(user_country));
    }

    if (toggleThemeButton) {
      toggleThemeButton.addEventListener("click", () => {
        document.body.classList.toggle("light-theme");

        axesLinearChart();
        if (barChart) {
          renderTopCountriesChart(topCountriesData);
        }
      });
    }

    document.addEventListener("keydown", (event) => {
      if (event.key === "/" && searchInput) {
        event.preventDefault();
        searchInput.focus();
      }

      if (event.key === "Escape" && searchCountryContainer) {
        searchCountryContainer.classList.add("hide");
      }
    });
  }

  /* ---------------------------------------------- */
  /*                     FETCH API                  */
  /* ---------------------------------------------- */
  async function fetchData(country) {
    user_country = country;
    if (country_name_element) {
      country_name_element.innerHTML = "Loading...";
    }

    cases_list = [];
    recovered_list = [];
    deaths_list = [];
    dates = [];
    formatedDates = [];

    const requestOptions = {
      method: "GET",
      redirect: "follow",
    };

    try {
      setLoadingState(true);
      const covidConfirmedRes = await fetch(
        `https://api.covid19api.com/total/country/${country}/status/confirmed`,
        requestOptions
      );
      const covidConfirmedJson = await covidConfirmedRes.json();
      covidConfirmedJson?.forEach((entry) => {
        dates.push(entry.Date);
        cases_list.push(entry.Cases);
      });

      const covidRecoveredRes = await fetch(
        `https://api.covid19api.com/total/country/${country}/status/recovered`,
        requestOptions
      );
      const covidRecoveredData = await covidRecoveredRes.json();
      covidRecoveredData?.forEach((entry) => {
        recovered_list.push(entry.Cases);
      });

      const covidDeathRes = await fetch(
        `https://api.covid19api.com/total/country/${country}/status/deaths`,
        requestOptions
      );
      const covidDeathData = await covidDeathRes.json();
      covidDeathData?.forEach((entry) => {
        deaths_list.push(entry.Cases);
      });

      await updateTopCountriesChart(requestOptions);
      updateUI();
      updateLastUpdated();
    } catch (error) {
      if (country_name_element) {
        country_name_element.innerHTML = "Could not load data";
      }
    } finally {
      setLoadingState(false);
    }
  }

  // Expose this for countries.js list selections.
  window.onCountrySelected = fetchData;
  window.fetchData = fetchData;

  // UPDATE UI FUNCTION
  function updateUI() {
    updateStats();
    axesLinearChart();
  }

  function updateStats() {
    const total_cases = cases_list[cases_list.length - 1] || 0;
    const previous_total_cases = cases_list[cases_list.length - 2] || total_cases;
    const new_confirmed_cases = total_cases - previous_total_cases;

    const total_recovered = recovered_list[recovered_list.length - 1] || 0;
    const previous_total_recovered = recovered_list[recovered_list.length - 2] || total_recovered;
    const new_recovered_cases = total_recovered - previous_total_recovered;

    const total_deaths = deaths_list[deaths_list.length - 1] || 0;
    const previous_total_deaths = deaths_list[deaths_list.length - 2] || total_deaths;
    const new_deaths_cases = total_deaths - previous_total_deaths;

    country_name_element.innerHTML = user_country;
    total_cases_element.innerHTML = total_cases.toLocaleString();
    new_cases_element.innerHTML = `+${new_confirmed_cases.toLocaleString()}`;
    recovered_element.innerHTML = total_recovered.toLocaleString();
    new_recovered_element.innerHTML = `+${new_recovered_cases.toLocaleString()}`;
    deaths_element.innerHTML = total_deaths.toLocaleString();
    new_deaths_element.innerHTML = `+${new_deaths_cases.toLocaleString()}`;

    dates.forEach((date) => {
      formatedDates.push(formatDate(date));
    });
  }

  // UPDATE CHART
  let my_chart;
  let topCountriesData = [];
  function axesLinearChart() {
    if (my_chart) {
      my_chart.destroy();
    }

    my_chart = new Chart(ctx, {
      type: "line",
      data: {
        datasets: [
          {
            label: "Cases",
            data: cases_list,
            fill: false,
            borderColor: "#FFF",
            backgroundColor: "#FFF",
            borderWidth: 1,
          },
          {
            label: "Recovered",
            data: recovered_list,
            fill: false,
            borderColor: "#009688",
            backgroundColor: "#009688",
            borderWidth: 1,
          },
          {
            label: "Deaths",
            data: deaths_list,
            fill: false,
            borderColor: "#f44336",
            backgroundColor: "#f44336",
            borderWidth: 1,
          },
        ],
        labels: formatedDates,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        legend: {
          labels: {
            fontColor: getChartTextColor(),
          },
        },
        scales: {
          xAxes: [{ ticks: { fontColor: getChartTextColor() } }],
          yAxes: [{ ticks: { fontColor: getChartTextColor() } }],
        },
      },
    });
  }

  let barChart;
  async function updateTopCountriesChart(requestOptions) {
    const summaryRes = await fetch("https://api.covid19api.com/summary", requestOptions);
    const summaryData = await summaryRes.json();

    topCountriesData = (summaryData.Countries || [])
      .sort((a, b) => b.TotalConfirmed - a.TotalConfirmed)
      .slice(0, 10);

    renderTopCountriesChart(topCountriesData);
  }

  function renderTopCountriesChart(topCountries) {
    if (barChart) {
      barChart.destroy();
    }

    barChart = new Chart(barChartElement, {
      type: "bar",
      data: {
        labels: topCountries.map((country) => country.Country),
        datasets: [
          {
            label: "Confirmed",
            data: topCountries.map((country) => country.TotalConfirmed),
            backgroundColor: "#c0392b",
          },
        ],
      },
      options: {
        responsive: true,
        legend: {
          labels: {
            fontColor: getChartTextColor(),
          },
        },
        scales: {
          yAxes: [
            {
              ticks: {
                beginAtZero: true,
                fontColor: getChartTextColor(),
              },
            },
          ],
          xAxes: [
            {
              ticks: {
                fontColor: getChartTextColor(),
              },
            },
          ],
        },
      },
    });
  }
}

// FORMAT DATES
const monthsNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function formatDate(dateString) {
  const date = new Date(dateString);
  return `${date.getDate()} ${monthsNames[date.getMonth()]}`;
}

function updateLastUpdated() {
  if (!lastUpdatedElement) {
    return;
  }

  lastUpdatedElement.textContent = `Last updated: ${new Date().toLocaleString()}`;
}

function setLoadingState(isLoading) {
  if (loadingIndicator) {
    loadingIndicator.classList.toggle("hide", !isLoading);
  }

  if (refreshButton) {
    refreshButton.disabled = isLoading;
  }
}
