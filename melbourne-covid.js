// Source for case numbers: covidlive.com.au
const fm = FileManager.iCloud();
const dir = fm.documentsDirectory();

const downloadCheerioIfNeeded = async () => {
  let filePath = fm.joinPath(dir, "cheerio.js");
  let isInstalled = await isFound(filePath);

  // If the package exists and autoupdate is off, stop checking further
  if (isInstalled) {
    console.log(
      `Cheerio.js is already installed, and autoupdate is disabled! Proceeding to import from disk...`
    );
    return;
  }

  console.log(`Cheerio.js was never installed previously. Downloading now...`);

  tryWriteFile(filePath, await getPackageSource());
  console.log(`Successfully installed cheerio!`);
  return;
};

const getPackageSource = async () => {
  // Get the standalone package source from wzrd.in
  let request = new Request(`https://wzrd.in/standalone/cheerio@1.0.0-rc.3`);
  let response = await request.loadString();
  return response;
};

const isFound = async (filePath) => {
  // Check if the package is already downloaded
  if (fm.fileExists(filePath)) {
    return true;
  }

  // Sync with iCloud and check again
  await syncFileWithiCloud(filePath);
  if (fm.fileExists(filePath)) {
    return true;
  }

  return false;
};

const syncFileWithiCloud = async (filePath) => {
  // Try to sync with iCloud in case the package exists only on iCloud
  try {
    console.log(`Attempting to sync with iCloud just in case...`);
    await fm.downloadFileFromiCloud(filePath);
    console.log(`Finished syncing ${filePath}`);
  } catch (err) {
    console.log(`${filePath} does not exist on iCloud.`);
  }
};

const tryWriteFile = (path, content) => {
  // Sometimes wzrd.in is acting up and the file content is undefined.
  // So, here is a little trick to let you know what's going on.
  try {
    console.log(`Saving cheerio.js to disk at ${path}...`);
    fm.writeString(path, content);
  } catch (err) {
    throw `The package source from 'https://wzrd.in/standalone/cheerio' is probably corrupted! Try with the different patch version.`;
  }
};

const getData = async () => {
  try {
    return await new Request("https://covidlive.com.au/vic").loadString();
  } catch (e) {
    console.log(e);
  }
};

const formatDate = (dateStr) => {
  const splittedDate = dateStr.split(" ");

  const months = [
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

  return `${splittedDate[0]}/${
    months.indexOf(splittedDate[1]) + 1
  }/${new Date().getFullYear()}`;
};

const prepareData = async (html) => {
  const cheerio = importModule("cheerio");
  const query = cheerio.load(html);

  const date = query("table.DAILY-CASES tr:nth-child(2) .DATE").text();

  const cases =
    query("table.DAILY-CASES tr:nth-child(2) .NEW").text() ||
    query("table.DAILY-CASES tr:nth-child(2) .NET").text();

  const metropolitanAverage = query(
    "div.DAYS-AVERAGE-METRO-VIC .info-item-3 p"
  ).text();

  const unknownCases = query(
    "div.DAYS-AVERAGE-METRO-VIC .info-item-4 p"
  ).text();

  return {
    cases: cases,
    date: formatDate(date),
    metropolitanAverage: metropolitanAverage,
    unknownCases: unknownCases,
  };
};

const createWidget = async () => {
  const data = await prepareData(await getData());
  const widget = new ListWidget();
  const header = widget.addText("🦠 Melbourne Covid Update".toUpperCase());
  header.font = Font.mediumSystemFont(10);
  if (data) {
    const isDataUpToDate = isToday(data.date);

    widget.addSpacer();
    const date = widget.addText("Date: " + data.date);
    date.font = Font.boldSystemFont(12);
    if (!isDataUpToDate) {
      date.textColor = Color.red();
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

    if (!isDataUpToDate && new Date().getHours() > 8) {
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
};

const isToday = (dateStringToCheck) => {
  const splittedDate = dateStringToCheck.split("/");
  const today = new Date();
  return (
    splittedDate[0] == today.getDate() &&
    splittedDate[1] == today.getMonth() + 1 &&
    splittedDate[2] == today.getFullYear()
  );
};

await downloadCheerioIfNeeded();

const widget = await createWidget();
if (!config.runsInWidget) {
  await widget.presentSmall();
}
Script.setWidget(widget);
Script.complete();
