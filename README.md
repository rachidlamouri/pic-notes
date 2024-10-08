# Notes

## Setup

```bash
. ./setup.sh
```

## Example

Save a picture/screenshot to `pics/` then run:

```bash
notes last
```

## Modification Query Synytax

### Add Tag

```sh
notes tag <id> my-tag
```

### Remove Tag

```sh.
notes tag <id> "-my-tag"
```

### Soft Set Value

Only overwrites the value if the current value list has zero or one values.

```sh
notes tag <id> my-tag:my-value
```

### Hard Set Value

Always overwrites the value if the current value list has zero or one values.

```sh
notes tag <id> my-tag:=my-value
```

### Set Empty Value

```sh
notes tag <id> my-tag:[]
```

### Set Multiple Values

```sh
notes tag <id> my-tag:[value1, value2, value3]
```

### Add Value to List

```sh
notes tag <id> my-tag:+my-value
```

### Remove Value from List

```sh
notes tag <id> my-tag:-value1
```

### Set Description

The description must come at the end of the query

```sh
notes tag <id> "#my description"
```

### Remove Description

Must come at the end of the query

```sh
notes tag <id> "-#"
```
