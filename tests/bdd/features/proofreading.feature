Feature: Proofreading Functionality

  Background:
    Given the extension is installed and enabled
    And the user has granted necessary permissions

  Scenario: Userproofreads English text
    Given the user has the extension popup open
    And the user clicks on the "Proofreading" tab
    When the user enters "This is a testt text with some errorss" in the input field
    And the user clicks the proofread button
    Then the proofread result should be displayed
    And the corrected text should be shown

  Scenario: Userproofreads Chinese text
    Given the user has the extension popup open
    And the user clicks on the "Proofreading" tab
    When the user enters "这是一个有错の文字" in the input field
    And the user clicks the proofread button
    Then the proofread result should be displayed
    And the corrected text should be shown

  Scenario: User accepts proofreading suggestions
    Given the user has received proofreading results
    When the user clicks "Accept" on a suggestion
    Then the suggestion should be applied to the text
    And the text should be updated accordingly

  Scenario: User rejects proofreading suggestions
    Given the user has received proofreading results
    When the user clicks "Reject" on a suggestion
    Then the original text should be preserved
    And the suggestion should be marked as rejected