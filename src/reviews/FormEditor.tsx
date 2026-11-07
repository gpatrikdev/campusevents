import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { HStack } from '@astryxdesign/core/HStack';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { Icon } from '@astryxdesign/core/Icon';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Selector } from '@astryxdesign/core/Selector';
import { StackItem } from '@astryxdesign/core/Stack';
import { Switch } from '@astryxdesign/core/Switch';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { VStack } from '@astryxdesign/core/VStack';
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import type { TFunction } from 'i18next';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DeleteIcon, GripIcon, PlusIcon } from '../components/EventIcons';
import {
  kindOf,
  newQuestion,
  type Question,
  type QuestionKind,
  questionKinds,
} from '../domain/reviewForm';

export function kindLabel(kind: QuestionKind, t: TFunction) {
  return {
    rating: t('Rating from 1 to 5'),
    radiogroup: t('Single choice'),
    checkbox: t('Multiple choice'),
    dropdown: t('Dropdown'),
    boolean: t('Yes or no'),
    number: t('Number'),
    comment: t('Free text'),
  }[kind];
}

function useReorderSensors() {
  return useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
}

/** Position, transform and lifted state for one sortable row, shared by questions and options. */
function useSortableRow(id: string) {
  const sortable = useSortable({ id });
  const { transform, transition, isDragging } = sortable;
  return {
    ...sortable,
    rowProps: {
      ref: sortable.setNodeRef,
      className: isDragging ? 'sortable-item is-dragging' : 'sortable-item',
      style: {
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        transition,
      },
    },
  };
}

const MAX_QUESTIONS = 30;
const MAX_OPTIONS = 20;

/**
 * Edits an ordered list of review questions. An empty list means the form has
 * no questions. Questions are reordered by dragging their handle, or from the
 * keyboard: Space or Enter on the handle picks a question up, the arrow keys
 * move it, and Space or Enter drops it.
 */
export function FormEditor({
  questions,
  onChange,
}: {
  questions: Question[];
  onChange: (questions: Question[]) => void;
}) {
  const { t } = useTranslation();
  const [kind, setKind] = useState<QuestionKind>('rating');
  const sensors = useReorderSensors();
  const ids = questions.map((question) => question.name);
  const position = (id: string | number) => ids.indexOf(String(id)) + 1;
  return (
    <VStack gap={4}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={({ active, over }) => {
          if (over && active.id !== over.id)
            onChange(arrayMove(questions, position(active.id) - 1, position(over.id) - 1));
        }}
        accessibility={{
          screenReaderInstructions: {
            draggable: t(
              'To move a question, press Space or Enter on its handle, use the up and down arrow keys, then press Space or Enter to drop it. Press Escape to cancel.',
            ),
          },
          announcements: {
            onDragStart: ({ active }) =>
              t('Picked up question {{position}}.', { position: position(active.id) }),
            onDragOver: ({ active, over }) =>
              over
                ? t('Question {{from}} is over position {{to}}.', {
                    from: position(active.id),
                    to: position(over.id),
                  })
                : undefined,
            onDragEnd: ({ active, over }) =>
              t('Question {{from}} was dropped at position {{to}}.', {
                from: position(active.id),
                to: position(over?.id ?? active.id),
              }),
            onDragCancel: ({ active }) =>
              t('Moving was cancelled. Question {{position}} kept its place.', {
                position: position(active.id),
              }),
          },
        }}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {questions.map((question, index) => (
            <QuestionCard
              key={question.name}
              question={question}
              position={index + 1}
              onChange={(next) => onChange(questions.map((item, i) => (i === index ? next : item)))}
              onRemove={() => onChange(questions.filter((_, i) => i !== index))}
            />
          ))}
        </SortableContext>
      </DndContext>
      <HStack gap={3} vAlign="end">
        <StackItem size="fill">
          <Selector
            label={t('Question type')}
            value={kind}
            options={questionKinds.map((value) => ({ value, label: kindLabel(value, t) }))}
            onChange={(value) => setKind(value as QuestionKind)}
            width="100%"
          />
        </StackItem>
        <Button
          label={t('Add question')}
          icon={<Icon icon={PlusIcon} />}
          isDisabled={questions.length >= MAX_QUESTIONS}
          onClick={() => onChange([...questions, newQuestion(kind)])}
        />
      </HStack>
    </VStack>
  );
}

function QuestionCard({
  question,
  position,
  onChange,
  onRemove,
}: {
  question: Question;
  position: number;
  onChange: (question: Question) => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const compact = useMediaQuery('(max-width: 42rem)');
  const { attributes, listeners, setActivatorNodeRef, isDragging, rowProps } = useSortableRow(
    question.name,
  );
  return (
    <VStack {...rowProps}>
      <Card padding={compact ? 4 : 6} elevation={isDragging ? 'med' : 'none'}>
        <VStack gap={4}>
          <HStack gap={2} vAlign="center" hAlign="between">
            <HStack gap={2} vAlign="center">
              <IconButton
                ref={setActivatorNodeRef}
                label={t('Reorder question {{position}}', { position })}
                tooltip={t('Drag to reorder')}
                icon={<Icon icon={GripIcon} />}
                variant="secondary"
                elevation={isDragging ? 'med' : 'low'}
                size="sm"
                className="drag-handle"
                {...attributes}
                {...listeners}
              />
              <Text weight="semibold">
                {t('Question {{position}}', { position })} · {kindLabel(kindOf(question), t)}
              </Text>
            </HStack>
            <IconButton
              label={t('Remove question {{position}}', { position })}
              tooltip={t('Remove question')}
              icon={<Icon icon={DeleteIcon} />}
              variant="destructive"
              size="sm"
              onClick={onRemove}
            />
          </HStack>
          <TextInput
            label={t('Question')}
            value={question.title}
            onChange={(title) => onChange({ ...question, title })}
            isRequired
          />
          {'choices' in question && (
            <OptionList
              choices={question.choices}
              onChange={(choices) => onChange({ ...question, choices })}
            />
          )}
          <Switch
            label={t('Answer required')}
            value={question.isRequired}
            onChange={(isRequired) => onChange({ ...question, isRequired })}
          />
        </VStack>
      </Card>
    </VStack>
  );
}

// Options can repeat while staff type them, so each row keeps its own id for dragging.
let optionSequence = 0;
const newOptionId = () => `option-${++optionSequence}`;

function OptionList({
  choices,
  onChange,
}: {
  choices: string[];
  onChange: (choices: string[]) => void;
}) {
  const { t } = useTranslation();
  const sensors = useReorderSensors();
  const ids = useRef<string[]>([]);
  // A copied template or a removed row changes the count, so the ids follow it.
  if (ids.current.length !== choices.length) ids.current = choices.map(() => newOptionId());
  const position = (id: string | number) => ids.current.indexOf(String(id)) + 1;
  const change = (nextIds: string[], next: string[]) => {
    ids.current = nextIds;
    onChange(next);
  };
  return (
    <VStack gap={3}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={({ active, over }) => {
          if (!over || active.id === over.id) return;
          const from = position(active.id) - 1;
          const to = position(over.id) - 1;
          change(arrayMove(ids.current, from, to), arrayMove(choices, from, to));
        }}
        accessibility={{
          screenReaderInstructions: {
            draggable: t(
              'To move an option, press Space or Enter on its handle, use the up and down arrow keys, then press Space or Enter to drop it. Press Escape to cancel.',
            ),
          },
          announcements: {
            onDragStart: ({ active }) =>
              t('Picked up option {{position}}.', { position: position(active.id) }),
            onDragOver: ({ active, over }) =>
              over
                ? t('Option {{from}} is over position {{to}}.', {
                    from: position(active.id),
                    to: position(over.id),
                  })
                : undefined,
            onDragEnd: ({ active, over }) =>
              t('Option {{from}} was dropped at position {{to}}.', {
                from: position(active.id),
                to: position(over?.id ?? active.id),
              }),
            onDragCancel: ({ active }) =>
              t('Moving was cancelled. Option {{position}} kept its place.', {
                position: position(active.id),
              }),
          },
        }}
      >
        <SortableContext items={ids.current} strategy={verticalListSortingStrategy}>
          {choices.map((choice, index) => (
            <OptionRow
              key={ids.current[index]}
              id={ids.current[index]}
              value={choice}
              number={index + 1}
              canRemove={choices.length > 2}
              onChange={(value) => onChange(choices.map((item, i) => (i === index ? value : item)))}
              onRemove={() =>
                change(
                  ids.current.filter((_, i) => i !== index),
                  choices.filter((_, i) => i !== index),
                )
              }
            />
          ))}
        </SortableContext>
      </DndContext>
      {/* Lines up with the option fields: the handle is 32px wide plus an 8px gap. */}
      <HStack paddingInlineStart={10}>
        <Button
          label={t('Add option')}
          icon={<Icon icon={PlusIcon} />}
          isDisabled={choices.length >= MAX_OPTIONS}
          onClick={() => change([...ids.current, newOptionId()], [...choices, ''])}
        />
      </HStack>
    </VStack>
  );
}

function OptionRow({
  id,
  value,
  number,
  canRemove,
  onChange,
  onRemove,
}: {
  id: string;
  value: string;
  number: number;
  canRemove: boolean;
  onChange: (value: string) => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const { attributes, listeners, setActivatorNodeRef, isDragging, rowProps } = useSortableRow(id);
  return (
    <HStack {...rowProps} gap={2} vAlign="end">
      <IconButton
        ref={setActivatorNodeRef}
        label={t('Reorder option {{number}}', { number })}
        tooltip={t('Drag to reorder')}
        icon={<Icon icon={GripIcon} />}
        variant="secondary"
        elevation={isDragging ? 'med' : 'low'}
        className="drag-handle"
        {...attributes}
        {...listeners}
      />
      <TextInput
        label={t('Option {{number}}', { number })}
        value={value}
        onChange={onChange}
        width="100%"
        isRequired
      />
      <IconButton
        label={t('Remove option {{number}}', { number })}
        icon={<Icon icon={DeleteIcon} />}
        variant="destructive"
        isDisabled={!canRemove}
        onClick={onRemove}
      />
    </HStack>
  );
}
