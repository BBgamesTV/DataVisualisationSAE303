"use strict";

// DOM Elements
const inputFile = document.getElementById("xls");
const output = document.getElementById("result");
const visageSelectContainer = document.getElementById("divVisageSelect");
const allVariables = ["TTT", "TF", "TP", "NBF", "NBEZ", "Lat"];

// XLSX Data Variables
let reader, workbook, parsedData;
let tableTSA, tableDT, variableList, ageIndex;

// Chart Instances
let boxplotChart, lineChart;

// Event Listener for File Input
inputFile.addEventListener("change", handleFileInput, false);

// Function: Handle File Input
function handleFileInput(event) {
  const file = event.target.files[0];
  reader = new FileReader();

  reader.onload = (e) => {
    const data = e.target.result;
    workbook = XLSX.read(data, { type: "array" });
    const firstWorksheet = workbook.Sheets[workbook.SheetNames[0]];
    parsedData = XLSX.utils.sheet_to_json(firstWorksheet, { header: 1 });

    processData(parsedData);
    setupEventListeners();
  };

  reader.readAsArrayBuffer(file);
}

// Function: Process XLSX Data
function processData(data) {
  tableTSA = data.filter(row => row[data[1].indexOf("Case")] === "TSA");
  tableDT = data.filter(row => row[data[1].indexOf("Case")] === "DT");
  ageIndex = data[1].indexOf("Age (ans)");
  variableList = data[1].filter(variable => variable !== "");

  populateSelectors();
}

// Function: Populate Select Dropdowns
function populateSelectors() {
  fillSelect("zoneSelect", ["Tete", "Yeux", "Bouche", "Ecran"]);
  fillSelect("variableSelect", allVariables);
  fillSelect("visageSelect", Array.from({ length: 4 }, (_, i) => `Visage${i + 1}`));
}

// Function: Fill Select Element with Options
function fillSelect(selectId, options) {
  const selectElement = document.getElementById(selectId);
  selectElement.innerHTML = "";

  options.forEach(optionValue => {
    const option = document.createElement("option");
    option.value = optionValue;
    option.textContent = optionValue;
    selectElement.appendChild(option);
  });
}

// Function: Setup Event Listeners for Selectors
function setupEventListeners() {
  ["zoneSelect", "variableSelect", "visageSelect"].forEach(id => {
    document.getElementById(id).addEventListener("change", renderVisualData);
  });
}

// Function: Render Visual Data
function renderVisualData() {
  const zone = document.getElementById("zoneSelect").value;
  const variable = document.getElementById("variableSelect").value;
  const visage = document.getElementById("visageSelect").value;

  const variableName =
    variable === "TTT" ? `${variable}_${visage}` : `${variable}_${zone}_${visage}`;
  const variableIndex = variableList.indexOf(variableName);

  const dtVariableValues = extractVariableValues(tableDT, variableIndex);
  const tsaVariableValues = extractVariableValues(tableTSA, variableIndex);
  const dtTwoVariableData = extractTwoVariables(tableDT, ageIndex, variableIndex);
  const tsaTwoVariableData = extractTwoVariables(tableTSA, ageIndex, variableIndex);

  renderLineChart(dtTwoVariableData, tsaTwoVariableData, variableName);
  renderBoxplot(dtVariableValues, tsaVariableValues, variable);
}

// Function: Extract Single Variable Values
function extractVariableValues(table, columnIndex) {
  return table.map(row => row[columnIndex]).filter(isValidValue);
}

// Function: Extract Two Variable Data
function extractTwoVariables(table, index1, index2) {
  const values1 = [], values2 = [];

  table.forEach(row => {
    if (isValidValue(row[index1]) && isValidValue(row[index2])) {
      values1.push(row[index1]);
      values2.push(row[index2]);
    }
  });

  return [values1, values2];
}

// Helper Function: Validate Value
function isValidValue(value) {
  return value !== null && value !== undefined && value !== "" && value !== 0 && value !== 1000;
}

// Function: Render Line Chart
function renderLineChart(dtData, tsaData, variableName) {
  const ctx = document.getElementById("canvasDT").getContext("2d");

  if (lineChart) lineChart.destroy();

  lineChart = new Chart(ctx, {
    type: "line",
    data: {
      datasets: [
        {
          label: "DT",
          backgroundColor: "rgba(255,0,0,0.1)",
          borderColor: "rgba(255,0,0,1.0)",
          data: processLineChartData(dtData),
          tension: 0.4,
          pointRadius: 3,
        },
        {
          label: "TSA",
          backgroundColor: "rgba(0,0,255,0.1)",
          borderColor: "rgba(0,0,255,1.0)",
          data: processLineChartData(tsaData),
          tension: 0.4,
          pointRadius: 3,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: `Evolution of ${variableName} by Age`,
        },
      },
      scales: {
        x: {
          type: "linear",
          title: {
            display: true,
            text: "Age (years)",
          },
          ticks: {
            stepSize: 0.5,
          },
        },
        y: {
          title: {
            display: true,
            text: variableName,
          },
        },
      },
    },
  });
}

// Function: Process Line Chart Data
function processLineChartData([ages, values]) {
  const dataMap = new Map();

  ages.forEach((age, index) => {
    const roundedAge = Math.round(age * 2) / 2;
    if (!dataMap.has(roundedAge)) {
      dataMap.set(roundedAge, []);
    }
    dataMap.get(roundedAge).push(values[index]);
  });

  return Array.from(dataMap.entries()).map(([age, vals]) => ({
    x: age,
    y: vals.reduce((a, b) => a + b, 0) / vals.length,
  })).sort((a, b) => a.x - b.x);
}

// Function: Render Boxplot
function renderBoxplot(dtValues, tsaValues, variable) {
  const ctx = document.getElementById("canvas").getContext("2d");

  if (boxplotChart) boxplotChart.destroy();

  boxplotChart = new Chart(ctx, {
    type: "boxplot",
    data: {
      labels: ["DT", "TSA"],
      datasets: [
        {
          label: variable,
          backgroundColor: "rgba(75, 192, 192, 0.2)",
          borderColor: "rgba(75, 192, 192, 1)",
          data: [dtValues, tsaValues],
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: `Boxplot of ${variable}`,
        },
      },
    },
  });
}
