export class Timestamp {
  year;
  month;
  day;
  hour;
  minute;
  second;

  static fromMonth(
    month: string,
    day: string,
    hour: string,
    minute: string,
    second: string,
    date = new Date(),
  ) {
    return new Timestamp(
      date.getFullYear().toString(),
      month,
      day,
      hour,
      minute,
      second,
    );
  }

  static fromDay(
    day: string,
    hour: string,
    minute: string,
    second: string,
    date = new Date(),
  ) {
    return new Timestamp(
      date.getFullYear().toString(),
      (date.getMonth() + 1).toString().padStart(2, '0'),
      day,
      hour,
      minute,
      second,
    );
  }

  static fromToday(
    hour: string,
    minute: string,
    second: string,
    date = new Date(),
  ) {
    return Timestamp.fromDay(
      date.getDate().toString().padStart(2, '0'),
      hour,
      minute,
      second,
      date,
    );
  }

  static fromNow() {
    const date = new Date();

    return Timestamp.fromToday(
      date.getHours().toString().padStart(2, '0'),
      date.getMinutes().toString().padStart(2, '0'),
      date.getSeconds().toString().padStart(2, '0'),
      date,
    );
  }

  constructor(
    year: string,
    month: string,
    day: string,
    hour: string,
    minute: string,
    second: string,
  ) {
    this.year = year;
    this.month = month;
    this.day = day;
    this.hour = hour;
    this.minute = minute;
    this.second = second;
  }

  get formatted() {
    return `${this.year}-${this.month}-${this.day}_${this.hour}-${this.minute}-${this.second}`;
  }

  get hash() {
    const [year, month, day, hour, minute, second] = [
      this.year.slice(-2),
      this.month,
      this.day,
      this.hour,
      this.minute,
      this.second,
    ];

    const result = `${year}-${month}-${day}:${hour}${minute[0]}-${minute[1]}${second}`;
    return result;
  }
}
