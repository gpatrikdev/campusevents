import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { type CompletingEvent, Model, type QuestionCommentModel } from 'survey-core';
import 'survey-core/i18n/hungarian';
import { Survey } from 'survey-react-ui';
import type { ReviewAnswers } from '../domain/types';
import { reviewForm, reviewTheme } from './form';

/**
 * The fixed review form. Given `answers`, it shows them read-only with no
 * Submit button. Otherwise `onSubmit` receives the answers and resolves to
 * whether the review was saved.
 */
export function ReviewSurvey({
  answers,
  onSubmit,
}: {
  answers?: ReviewAnswers;
  onSubmit?: (answers: ReviewAnswers) => Promise<boolean>;
}) {
  const { t, i18n } = useTranslation();
  const model = useMemo(() => {
    const survey = new Model(reviewForm);
    survey.applyTheme(reviewTheme);
    if (answers) {
      survey.data = answers;
      survey.readOnly = true;
    }
    return survey;
  }, [answers]);
  useEffect(() => {
    model.locale = i18n.language;
    model.completeText = t('Submit review');
    // Astryx forms mark required fields "∙ Required" rather than with a red
    // asterisk. SurveyJS hides the mark from screen readers. A submitted
    // review has nothing left to fill in, so it drops the mark.
    model.requiredMark = answers ? '' : `∙ ${t('Required')}`;
    const comment = model.getQuestionByName('comment') as QuestionCommentModel;
    comment.placeholder = answers ? t('No comment') : '';
  }, [model, answers, i18n.language, t]);
  useEffect(() => {
    if (!onSubmit) return;
    const submit = async (sender: Model, options: CompletingEvent) => {
      options.allow = await onSubmit({
        rating: Number(sender.data.rating),
        comment: String(sender.data.comment ?? ''),
      });
    };
    model.onCompleting.add(submit);
    return () => model.onCompleting.remove(submit);
  }, [model, onSubmit]);
  useEffect(() => () => model.dispose(), [model]);
  return <Survey model={model} />;
}
