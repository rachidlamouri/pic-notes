function assertLength(value: string, length: 2 | 4) {
  if (value.length !== length) {
    throw new Error(
      `Expected length "${length}" but received value "${value}"`,
    );
  }
}

export class Timestamp {
  year;
  month;
  day;
  hour;
  minute;
  second;

  static fromNow() {
    return new Timestamp(
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    );
  }

  constructor(
    optionalYear: string | undefined,
    optionalMonth: string | undefined,
    optionalDay: string | undefined,
    optionalHour: string | undefined,
    optionalMinute: string | undefined,
    optionalSecond: string | undefined,
  ) {
    const date = new Date();
    const currentYear = date.getFullYear().toString();
    let year: string;
    if (optionalYear === undefined) {
      year = currentYear;
    } else if (optionalYear.length === 2) {
      year = currentYear.slice(0, 2) + optionalYear;
    } else {
      year = optionalYear;
    }
    const month =
      optionalMonth ?? (date.getMonth() + 1).toString().padStart(2, '0');
    const day = optionalDay ?? date.getDate().toString().padStart(2, '0');
    const hour = optionalHour ?? date.getHours().toString().padStart(2, '0');
    const minute =
      optionalMinute ?? date.getMinutes().toString().padStart(2, '0');
    const second =
      optionalSecond ?? date.getSeconds().toString().padStart(2, '0');

    assertLength(year, 4);
    assertLength(month, 2);
    assertLength(day, 2);
    assertLength(hour, 2);
    assertLength(minute, 2);
    assertLength(second, 2);

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
