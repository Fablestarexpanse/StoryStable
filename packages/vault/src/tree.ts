/**
 * File tree for the navigator.
 *
 * Builds a nested folder structure from flat root-relative paths so the
 * vault reads like the folder layout on disk rather than a wall of paths.
 */

export interface TreeFile {
  kind: 'file';
  /** Root-relative path. */
  path: string;
  /** Filename including extension. */
  name: string;
  /** Display label — filename without the `.md` extension. */
  label: string;
  /** Classification for the icon/badge, e.g. `md`, `canvas`, `image`. */
  fileKind: string;
}

export interface TreeFolder {
  kind: 'folder';
  /** Root-relative folder path, e.g. `World/Characters`. */
  path: string;
  name: string;
  children: TreeNode[];
  /** Total files in this folder and everything under it. */
  fileCount: number;
}

export type TreeNode = TreeFolder | TreeFile;

export interface TreeInput {
  path: string;
  /** Optional classification; defaults to the file extension. */
  kind?: string;
}

function classify(name: string, given: string | undefined): string {
  if (given !== undefined && given !== '') return given;
  const dot = name.lastIndexOf('.');
  return dot === -1 ? 'file' : name.slice(dot + 1).toLowerCase();
}

/**
 * Build a sorted tree. Folders sort before files, both alphabetically and
 * case-insensitively, so the ordering matches what a file manager shows.
 */
export function buildFileTree(inputs: readonly TreeInput[]): TreeFolder {
  const root: TreeFolder = {
    kind: 'folder',
    path: '',
    name: '',
    children: [],
    fileCount: 0,
  };

  for (const input of inputs) {
    const parts = input.path.split('/').filter((p) => p !== '');
    if (parts.length === 0) continue;
    const fileName = parts[parts.length - 1];
    if (fileName === undefined) continue;

    let cursor = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const segment = parts[i];
      if (segment === undefined) continue;
      const childPath = cursor.path === '' ? segment : `${cursor.path}/${segment}`;
      let next = cursor.children.find(
        (c): c is TreeFolder => c.kind === 'folder' && c.name === segment,
      );
      if (!next) {
        next = {
          kind: 'folder',
          path: childPath,
          name: segment,
          children: [],
          fileCount: 0,
        };
        cursor.children.push(next);
      }
      cursor = next;
    }

    cursor.children.push({
      kind: 'file',
      path: input.path,
      name: fileName,
      label: fileName.replace(/\.md$/i, ''),
      fileKind: classify(fileName, input.kind),
    });
  }

  sortAndCount(root);
  return root;
}

function sortAndCount(folder: TreeFolder): number {
  folder.children.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1;
    const an = a.kind === 'folder' ? a.name : a.label;
    const bn = b.kind === 'folder' ? b.name : b.label;
    return an.localeCompare(bn, undefined, { sensitivity: 'base', numeric: true });
  });

  let count = 0;
  for (const child of folder.children) {
    count += child.kind === 'folder' ? sortAndCount(child) : 1;
  }
  folder.fileCount = count;
  return count;
}

/** Every folder path in the tree, for pickers and expand-all. */
export function folderPaths(folder: TreeFolder): string[] {
  const out: string[] = [];
  for (const child of folder.children) {
    if (child.kind !== 'folder') continue;
    out.push(child.path);
    out.push(...folderPaths(child));
  }
  return out;
}

/** Ancestor folder paths of a file, nearest-last — used to reveal a note. */
export function ancestorsOf(path: string): string[] {
  const parts = path.split('/').filter((p) => p !== '');
  const out: string[] = [];
  for (let i = 0; i < parts.length - 1; i++) {
    out.push(parts.slice(0, i + 1).join('/'));
  }
  return out;
}
