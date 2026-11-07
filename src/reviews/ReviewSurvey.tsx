import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { type CompletingEvent, Model, type QuestionCommentModel } from 'survey-core';
import 'survey-core/i18n/hungarian';
import { Survey } from 'survey-react-ui';
import type { ReviewAnswers, ReviewForm } from '../domain/reviewForm';
import { reviewTheme } from './form';

/**
 * An event's review form. Given `answers`, it shows them read-only with no
 * Submit button. Otherwise `onSubmit` receives the answers and resolves to
 * whether the review was saved.
 */
export function ReviewSurvey({
  form,
  answers,
  onSubmit,
}: {
  form: ReviewForm;
  answers?: ReviewAnswers;
  onSubmit?: (answers: ReviewAnswers) => Promise<boolean>;
}) {
  const { t, i18n } = useTranslation();
  const model = useMemo(() => {
    const survey = new Model({ showQuestionNumbers: 'off', showCompletedPage: false, ...form });
    survey.applyTheme(reviewTheme);
    if (answers) {
      survey.data = answers;
      survey.readOnly = true;
    }
    return survey;
  }, [form, answers]);
  useEffect(() => {
    model.locale = i18n.language;
    model.completeText = t('Submit review');
    // Astryx forms mark required fields "∙ Required" rather than with a red
    // asterisk. SurveyJS hides the mark from screen readers. A submitted
    // review has nothing left to fill in, so it drops the mark.
    model.requiredMark = answers ? '' : `∙ ${t('Required')}`;
    for (const question of model.getAllQuestions())
      if (question.getType() === 'comment')
        (question as QuestionCommentModel).placeholder = answers ? t('No answer') : '';
  }, [model, answers, i18n.language, t]);
  useEffect(() => {
    if (!onSubmit) return;
    const submit = async (sender: Model, options: CompletingEvent) => {
      options.allow = await onSubmit(sender.data);
    };
    model.onCompleting.add(submit);
    return () => model.onCompleting.remove(submit);
  }, [model, onSubmit]);
  useEffect(() => () => model.dispose(), [model]);
  return <Survey model={model} />;
}
