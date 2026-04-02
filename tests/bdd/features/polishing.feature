Feature: Text Polishing Functionality

  Background:
    Given the extension is installed and enabled
    And the user has granted necessary permissions

  Scenario: User polishes informal text to formal tone
    Given the user has the extension popup open
    And the user clicks on the "Polishing" tab
    When the user enters "Hey, wanna grab some food?" in the input field
    And the user selects "Formal" as polishing style
    And the user clicks the polish button
    Then the polished result should be displayed
    And the result should have a formal tone

  Scenario: User polishes text to casual tone
    Given the user has the extension popup open
    And the user clicks on the "Polishing" tab
    When the user enters "I would like to request your assistance with this matter" in the input field
    And the user selects "Casual" as polishing style
    And the user clicks the polish button
    Then the polished result should be displayed
    And the result should have a casual tone

  Scenario: User polishes text to professional tone
    Given the user has the extension popup open
    And the user clicks on the "Polishing" tab
    When the user enters "Hey team, just wanted to say good job!" in the input field
    And the user selects "Professional" as polishing style
    And the user clicks the polish button
    Then the polished result should be displayed
    And the result should have a professional tone