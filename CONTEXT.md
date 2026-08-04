# zeetab — Ubiquitous Language

Glossary of domain terms. Implementation details do not belong here.

## Terms

### Shortcut
A single saved link: a URL, a label, and an Icon Source. The atomic unit the
user pins to their new tab.

### Section
A named (or unnamed) group of Shortcuts. Sections can be collapsed. The grid
is an ordered list of Sections.

### Config
The complete persisted state of a user's new tab: an ordered list of Sections
and a schema version. Owned entirely by the user's browser; there is no
server-side state.

### Preference
A device-local UI setting, stored outside the Config under its own
versioned key. Unlike the Config, Preferences never travel via
Import/Export and don't participate in `CONFIG_VERSION` or migrations —
they describe how this browser's UI behaves, not the user's data.

### Icon Source
Where a Shortcut's icon comes from: either **auto** (resolved from the
shortcut's domain) or **upload** (an image the user provided).

### Extension
The distributable browser package (Chrome / Firefox) that replaces the
browser's new tab page with zeetab. One of the two artifacts built from this
repo.

### Demo
The same app built as a public website (zeetab.zacca.dev) so people can try
zeetab without installing anything. The other artifact built from this repo.
The Demo and the Extension never share state; moving a Config between them
is done explicitly via import/export.

### Import / Export
The explicit, file-based way a user moves a Config between browsers,
machines, or between the Demo and the Extension.

### Preference
A device-local setting that shapes how the UI behaves (e.g. whether moving a
Shortcut between Sections asks for confirmation). Not part of the Config: it
never travels via Import / Export.
