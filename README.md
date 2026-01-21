# Notes

## Setup

```bash
. ./setup.sh
```

## Example

Save a picture/screenshot to `pics/` then run:

```bash
notes get --latest
```

## Freeform Notes

Use the [./freeform](./freeform/) directory to save any personal supplemental files. This folder gets saved by the `backup` command as well.

## Tag Value Unit Syntax

Modification and search queries both contain syntax of the form `<tag-name>:<value-unit>`. The syntax for a value unit is as follows:

> [!NOTE]
> Angle brackets are placeholders (except for the >> operator), and square brackets are literals

```sh
# No value
<tag-name>:[]

# Single value
<tag-name>:<tag-value>

#Multiple values
<tag-name>:[<tag-value-1> tag-value-2 tag-value-3]
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

### Rename Tag

Renames a tag without losing its value list.

```sh
## note: the operator is ">>"
notes tag <id> "<old-tag-name> >> <new-tag-name>"
```

### Soft Set Value Unit

Only overwrites the value if the current value list has zero or one values.

```sh
notes tag <id> "<tag-name>:<value-unit>"
```

### Hard Set Value Unit

Always overwrites the value even if the current value list has more than one value.

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

### List Index

Prints a list of all tag names or all tag values for a specific tag name.

```sh
# lists all tag names
notes list-index

# lists all values for the tag name "potato"
notes list-index potato
```

### Document

Opens a text editor for viewing user-generated documentation about tag names. Also works for tag values corresponding to secondary index tags. Save and close the text file to save the documentation.

```sh
# Example 1: List documentation for all primary index tag names
notes document

# Text File Example 1:
# tag-name-1 | description 1
# tag-name-2 |
# tag-name-3 | description 3
# tag-name-4 |


# Example 2: List documentation for all secondary index keys for the tag "potato"
notes document potato

# Text File Example 1:
# potato:tag-value-1 | description 1
# potato:tag-value-2 |
# potato:tag-value-3 | description 3
# potato:tag-value-4 |


```
