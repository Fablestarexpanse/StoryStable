import { useMemo, useState } from 'react';
import {
  buildFileTree,
  ancestorsOf,
  ENTITY_TEMPLATES,
  createEntity,
  slugify,
  type TreeFolder,
  type TreeNode,
} from '@storystable/vault';

interface Props {
  notePaths: string[];
  attachmentPaths: { path: string; kind: string }[];
  selected: string | null;
  onOpen: (path: string) => void;
  onCreateNote: (path: string, source: string) => Promise<void>;
  onCreateFolder: (path: string) => Promise<void>;
}

/** Folders that start expanded, so a fresh vault is not a wall of arrows. */
const DEFAULT_OPEN = ['World', 'Story', 'Production'];

export function NavigatorTree({
  notePaths,
  attachmentPaths,
  selected,
  onOpen,
  onCreateNote,
  onCreateFolder,
}: Props) {
  const tree = useMemo(
    () =>
      buildFileTree([
        ...notePaths.map((path) => ({ path, kind: 'md' })),
        ...attachmentPaths.map((a) => ({ path: a.path, kind: a.kind })),
      ]),
    [notePaths, attachmentPaths],
  );

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Keep the selected note's ancestors visible.
  const revealed = useMemo(() => new Set(selected ? ancestorsOf(selected) : []), [selected]);

  const isOpen = (path: string) => {
    if (revealed.has(path)) return true;
    if (collapsed.has(path)) return false;
    // Default: top-level known folders open, everything else closed.
    return DEFAULT_OPEN.includes(path) || path.includes('/');
  };

  const toggle = (path: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      // A revealed ancestor would otherwise ignore the click.
      if (revealed.has(path)) next.add(path);
      return next;
    });
  };

  const run = (action: Promise<void>) => {
    setMenuFor(null);
    action.catch((e: unknown) => {
      setError(typeof e === 'string' ? e : e instanceof Error ? e.message : String(e));
    });
  };

  const newFolder = (parent: string) => {
    const name = window.prompt(`New folder inside ${parent === '' ? 'the vault root' : parent}`);
    if (name === null || name.trim() === '') return;
    const path = parent === '' ? name.trim() : `${parent}/${name.trim()}`;
    run(onCreateFolder(path));
  };

  const newNote = (parent: string) => {
    const title = window.prompt(`New note in ${parent === '' ? 'the vault root' : parent}`);
    if (title === null || title.trim() === '') return;
    const path = `${parent === '' ? '' : `${parent}/`}${slugify(title.trim())}.md`;
    if (notePaths.includes(path)) {
      setError(`${path} already exists`);
      setMenuFor(null);
      return;
    }
    run(onCreateNote(path, `# ${title.trim()}\n\n`));
  };

  const newEntity = (parent: string, entityType: string) => {
    const template = ENTITY_TEMPLATES.find((t) => t.entityType === entityType);
    if (!template) return;
    const title = window.prompt(`New ${template.label} in ${parent === '' ? 'root' : parent}`);
    if (title === null || title.trim() === '') return;
    const entity = createEntity(template, title.trim(), new Date().toISOString());
    // Create in the clicked folder rather than the template's default.
    const fileName = entity.path.split('/').pop() ?? `${slugify(title.trim())}.md`;
    const path = parent === '' ? fileName : `${parent}/${fileName}`;
    if (notePaths.includes(path)) {
      setError(`${path} already exists`);
      setMenuFor(null);
      return;
    }
    run(onCreateNote(path, entity.source));
  };

  const renderNode = (node: TreeNode, depth: number) => {
    if (node.kind === 'file') {
      return (
        <li key={node.path} style={{ paddingLeft: `${String(depth * 12)}px` }}>
          <button
            className={node.path === selected ? 'tree-file active' : 'tree-file'}
            onClick={() => {
              onOpen(node.path);
            }}
            title={node.path}
          >
            <span className={`file-dot kind-${node.fileKind}`} />
            {node.label}
          </button>
        </li>
      );
    }
    return renderFolder(node, depth);
  };

  const renderFolder = (folder: TreeFolder, depth: number) => {
    const open = isOpen(folder.path);
    return (
      <li key={folder.path}>
        <div className="tree-folder-row" style={{ paddingLeft: `${String(depth * 12)}px` }}>
          <button
            className="tree-folder"
            onClick={() => {
              toggle(folder.path);
            }}
          >
            <span className="twisty">{open ? '▾' : '▸'}</span>
            {folder.name}
            <span className="count-muted">{folder.fileCount}</span>
          </button>
          <button
            className="tree-add"
            title={`Add to ${folder.path}`}
            onClick={() => {
              setMenuFor(menuFor === folder.path ? null : folder.path);
            }}
          >
            +
          </button>
        </div>
        {menuFor === folder.path && renderMenu(folder.path)}
        {open && folder.children.length > 0 && (
          <ul className="tree-children">
            {folder.children.map((child) => renderNode(child, depth + 1))}
          </ul>
        )}
      </li>
    );
  };

  const renderMenu = (parent: string) => (
    <div className="tree-menu">
      <button
        onClick={() => {
          newFolder(parent);
        }}
      >
        New folder…
      </button>
      <button
        onClick={() => {
          newNote(parent);
        }}
      >
        New note…
      </button>
      <div className="tree-menu-sep">From template</div>
      {ENTITY_TEMPLATES.map((t) => (
        <button
          key={t.entityType}
          onClick={() => {
            newEntity(parent, t.entityType);
          }}
        >
          {t.label}…
        </button>
      ))}
    </div>
  );

  return (
    <div className="tree">
      <div className="tree-root-actions">
        <button
          className="tree-add"
          title="Add at vault root"
          onClick={() => {
            setMenuFor(menuFor === '' ? null : '');
          }}
        >
          + New
        </button>
      </div>
      {menuFor === '' && renderMenu('')}
      {error !== null && <p className="error">{error}</p>}
      <ul className="tree-children">
        {tree.children.length === 0 && <li className="hint">Empty vault.</li>}
        {tree.children.map((child) => renderNode(child, 0))}
      </ul>
    </div>
  );
}
