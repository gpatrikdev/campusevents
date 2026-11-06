import { AspectRatio } from '@astryxdesign/core/AspectRatio';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useLexicalNodeSelection } from '@lexical/react/useLexicalNodeSelection';
import {
  DecoratorNode,
  type LexicalUpdateJSON,
  type NodeKey,
  type SerializedLexicalNode,
  type Spread,
} from 'lexical';
import type { ReactElement } from 'react';
import { imageUrl } from '../api/images';
import { IMAGE_TYPES } from '../domain/rules';

const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
export const imageAccept = IMAGE_TYPES.join(',');

type SerializedImageNode = Spread<{ imageId: string; altText: string }, SerializedLexicalNode>;

/* An uploaded image on its own line in an event description. It keeps the
 * image id rather than an address, so only this app's uploads can appear, and
 * moving the images to another host needs no change to saved events. */
export class ImageNode extends DecoratorNode<ReactElement> {
  __imageId: string;
  __altText: string;

  static getType() {
    return 'image';
  }

  static clone(node: ImageNode) {
    return new ImageNode(node.__imageId, node.__altText, node.__key);
  }

  static importJSON(json: SerializedImageNode) {
    return $createImageNode(json.imageId, json.altText).updateFromJSON(
      json as LexicalUpdateJSON<SerializedLexicalNode>,
    );
  }

  constructor(imageId = '', altText = '', key?: NodeKey) {
    super(key);
    this.__imageId = imageId;
    this.__altText = altText;
  }

  exportJSON(): SerializedImageNode {
    return { ...super.exportJSON(), imageId: this.__imageId, altText: this.__altText };
  }

  createDOM() {
    const element = document.createElement('figure');
    element.className = 'rich-image';
    return element;
  }

  updateDOM() {
    return false;
  }

  isInline() {
    return false;
  }

  // An image alone doesn't count as a description.
  getTextContent() {
    return '';
  }

  decorate() {
    return <RichImage nodeKey={this.getKey()} imageId={this.__imageId} alt={this.__altText} />;
  }
}

export function $createImageNode(imageId: string, altText: string) {
  return new ImageNode(imageId, altText);
}

// Pass to every editor and view that shows event descriptions.
export const richTextNodes = [ImageNode];

function RichImage({ nodeKey, imageId, alt }: { nodeKey: NodeKey; imageId: string; alt: string }) {
  const [editor] = useLexicalComposerContext();
  const [isSelected, setSelected, clearSelection] = useLexicalNodeSelection(nodeKey);
  if (!uuid.test(imageId)) return null;
  return (
    // Clicking selects the image in the editor, so Backspace can remove it.
    // biome-ignore lint/a11y/useKeyWithClickEvents: arrow keys reach the image through Lexical
    <img
      src={imageUrl(imageId)}
      alt={alt}
      loading="lazy"
      draggable={false}
      data-selected={isSelected || undefined}
      onClick={(event) => {
        if (!editor.isEditable()) return;
        if (!event.shiftKey) clearSelection();
        setSelected(true);
      }}
    />
  );
}

// A wide crop across the top of an event page. The title follows it, so it is decorative.
export function BannerImage({ id }: { id: string }) {
  return (
    <AspectRatio ratio={3} fit="cover" className="event-banner">
      <img src={imageUrl(id)} alt="" />
    </AspectRatio>
  );
}
