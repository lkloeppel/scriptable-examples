const covidData = "http://lukaskloeppel.de/covid";

const widget = await createWidget();
if (!config.runsInWidget) {
  await widget.presentSmall();
}
Script.setWidget(widget);
Script.complete();

async function createWidget() {
  const data = await getData();
  const widget = new ListWidget();
  const header = widget.addText("🦠 Melbourne Covid Update".toUpperCase());
  header.font = Font.mediumSystemFont(10);
  if (data) {
    const isDataUpToDate = isToday(data.date);

    widget.addSpacer();
    const date = widget.addText("Date: " + data.date);
    date.font = Font.boldSystemFont(12);
    if (!isDataUpToDate) {
      cases.textColor = Color.red();
    }

    const cases = widget.addText("Cases: " + data.cases);
    cases.font = Font.boldSystemFont(16);
    cases.textColor = data.cases >= 10 ? Color.red() : Color.green();

    const average = widget.addText(
      "14-day average: " + data.metropolitanAverage
    );
    average.font = Font.boldSystemFont(16);
    average.textColor = Color.orange();

    const unknownCases = widget.addText("Unknown cases: " + data.unknownCases);
    unknownCases.unknownCases = Font.boldSystemFont(16);

    if (!isDataUpToDate && (new Date()).getHours() > 8) {
      // Else update all 5 minutes
      widget.refreshAfterDate = new Date(Date.now() + 5 * 60 * 1000);
    } else {
      // Update every 2 hrs
      widget.refreshAfterDate = new Date(Date.now() + 120 * 60 * 1000);
    }
  } else {
    widget.addSpacer();
    widget.addText("No data available");
  }
  return widget;
}

async function getData() {
  try {
    return await new Request(covidData).loadJSON();
  } catch (e) {
    console.log(e);
  }
}

function isToday(dateStringToCheck) {
  const splittedDate = dateStringToCheck.split("/");
  const today = new Date();
  return (
    splittedDate[0] == today.getDate() &&
    splittedDate[1] == today.getMonth() + 1 &&
    splittedDate[2] == today.getFullYear()
  );
}
