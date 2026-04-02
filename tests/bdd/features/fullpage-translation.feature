Feature: Full Page Translation

  Background:
    Given the extension is installed and enabled
    And the user has granted necessary permissions
    And the user is on a webpage with translatable content

  Scenario: User translates entire page
    When the user right-clicks on the page
    And selects "Translate this page" from the context menu
    Then the page content should be translated
    And the translation overlay should appear

  Scenario: User translates selected text
    Given the user has selected text on the page
    When the user right-clicks on the selected text
    And selects "Translate" from the context menu
    Then the selected text should be translated
    And a tooltip with translation should appear

  Scenario: Page translation maintains structure
    When the user translates the page
    Then the original layout should be preserved
    And headings, paragraphs, and lists should remain intact

  Scenario: User toggles bilingual display
    Given the page translation is displayed
    When the user clicks the bilingual toggle
    Then both original and translated text should be visible
    And the display should be side-by-side or highlighted

  Scenario: User closes translation overlay
    Given the page translation is displayed
    When the user clicks the close button
    Then the translation overlay should be removed
    And the original page content should be restored