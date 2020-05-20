# OS-lifecycle

Operating System support lifecycle

![CI](https://github.com/projectlint/OS-lifecycle/workflows/CI/badge.svg)

## Data sources

- [Carnegie Mellon](https://computing.cs.cmu.edu/desktop/os-lifecycle.html)
- [Ubuntu releases](https://wiki.ubuntu.com/Releases)
- [Ubuntu `distro-info-data`](https://salsa.debian.org/debian/distro-info-data)

## API

Module export a function with a single `now` optional argument to ask for the
maintained operating systems in a specified date (current date by default),
inspired by [@pkgjs/nv](https://github.com/pkgjs/nv). The module also return by
default the data for all the registered operating systems versions. Raw-ish
data can be get in the `index.json` file.

Returned data format (both for function calls or exported by default) is an
object with the next entries:

- `all` entry, with a list of all data entries at the specified date
- OS families, each one with a special `newest` entry with the most recently
  released one
- Operating systems entries for each one

Each operating system entry is a plain object with some or all the fields:

- `codename`
- `created`
- `eol`
- `lts`
- `name`
- `release`
- `series`
- `version`
