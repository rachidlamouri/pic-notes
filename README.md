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

## Tag Value Unit Syntax

Modification and search queries both contain syntax of the form `<tag-name>:<value-unit>`. The syntax for a value unit is as follows:

**note**: the angle brackets are placeholders, and the square brackets are literals

```sh
# No value
<tag-name>:[]

# Single value
<tag-name>:<tag-value>

#Multiple values
<tag-name>:[<tag-value-1>, tag-value-2, tag-value-3]
```

## Modification Query Synytax

### Add Tag

```sh
notes tag <id> "<tag-name>"
```

### Remove Tag

```sh
notes tag <id> "-<tag-name>"
```

### Soft Set Value Unit

Only overwrites the value if the current value list has zero or one values.

```sh
notes tag <id> "<tag-name>:<value-unit>"
```

### Hard Set Value Unit

Always overwrites the value if the current value list has zero or one values.

```sh
notes tag <id> "<tag-name>:=<value-unit>"
```

### Add Value to List

```sh
notes tag <id> "<tag-name>:+<value-unit>"
```

### Remove Value from List

```sh
notes tag <id> "<tag-name>:-<value-unit>"
```

### Set Description

#### Inline

The description must come at the end of the query

```sh
notes tag <id> "<optional-subquery>#<description>"
```

#### Standalone Command

Opens the description in VSCode and waits for the file to be closed before setting the description to the file contents.

```sh
notes describe <id>
```

### Remove Description

Must come at the end of the query

```sh
notes tag <id> "<optional-subquery>-#"
```

## Search Query Syntax

### Limit

Use the limit argument to return `n` metadata. There is no guarantee on the order.

```sh
notes search "<query>" --limit <n>
```

### Has Tag Name

Returns all metadata containing the tag name

```sh
notes search "<tag-name>"
```

### Has Any Tag Value

Returns all metadata containing the tag name and at least one value in the value unit.

```sh
# note: this takes a single value, not a value unit
notes search "<tag-name>:<tag-value>"

# note: this syntax accepts a value unit
notes search "<tag-name>:~<value-unit>"
```

### Has All Tag Values

Returns all metadata containing the tag name and all values in the value unit. The value unit may be a subset of the value unit of matching metadata.

```sh
notes search "<tag-name>:^<value-unit>"
```

### Has Exact Tag Values

Returns all metadata containing the tag name and all (and only all) values in the value unit.

```sh
notes search "<tag-name>:=<value-unit>"
```

### Intersection

Returns the subset of metadata that exists in both subqueries.

```sh
notes search "<subquery-1> ^ <subquery-2>"
```

### Union

Returns all metadata from both subqueries.

```sh
notes search "<subquery-1> + <subquery-2>"
```

### Difference

Returns the metadata from the first query that is not in the second query.

```sh
notes search "<subquery-1> - <subquery-2>"
```

### Select All

Returns all metadata.

```sh
# note: not very useful on its own
notes search "*"

# Useful example:
notes search "* - <tag-name>:~<value-unit>"
```

## Auxiliary Commands

### Backup

Copies picture data and metadata to a backup folder.

```sh
notes backup
```

### Combine

Combines two or more images into a single horizontal or vertical image.

```sh
# pass the --horizontal flag instead to make it horizontal
notes combine <id1> <id2> [<id3>...] --vertical
```
