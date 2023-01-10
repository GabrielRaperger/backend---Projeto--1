const moment = require("moment");

moment.locale("pt");

function getCurrentDateTime() {
  return moment().add(1, "h").format("L LT");
}

function getCurrentAsISO() {
  return moment().add(1, 'h').toISOString()
}

function formatDateToString(date) {
  return moment(date).format("YYYY-MM-DD");
}

function formatDateTimeToString(date) {
  return moment(date).format("L LT");
}

function formatStringToISODate(date) {
  return moment(date, "DD/MM/YYYY HH:mm").toISOString()
}

function formatDateToISO(date) {
  return moment(date).toISOString();
}

function isBefore(date, compare) {
  return moment(date).isBefore(compare);
}

function isAfter(date, compare) {
  return moment(date).isAfter(compare);
}

function isSameDay(date, compare) {
  return moment(date).isSame(compare, "day");
}

function getToday() {
  return moment().format("YYYY-MM-DD");
}

function convertToSeconds(date = moment()) {
  return moment(date).diff(moment().startOf("day"), "seconds");
}

function convertSecondsToHours(secs) {
  return moment.utc(secs * 1000).format("HH:mm:ss");
}

function convertSecondsToHoursAndMinutes(secs) {
  return moment.utc(secs * 1000).format("HH:mm");
}

function convertToDate(date) {
  return moment(date).toDate();
}

function getNumberOfDaysInMonth(date = getToday()) {
  return moment(date).daysInMonth();
}

function setDayToDate(date, day) {
  return moment(date).date(day);
}

module.exports = {
  getCurrentDateTime,
  formatDateToString,
  isBefore,
  getToday,
  convertToSeconds,
  isSameDay,
  convertSecondsToHours,
  convertToDate,
  getNumberOfDaysInMonth,
  setDayToDate,
  formatDateToISO,
  convertSecondsToHoursAndMinutes,
  isAfter,
  getCurrentAsISO,
  formatDateTimeToString,
  formatStringToISODate
};
