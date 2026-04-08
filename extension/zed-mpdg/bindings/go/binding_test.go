package tree_sitter_mpdg_test

import (
	"testing"

	tree_sitter "github.com/smacker/go-tree-sitter"
	"github.com/tree-sitter/tree-sitter-mpdg"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_mpdg.Language())
	if language == nil {
		t.Errorf("Error loading Mpdg grammar")
	}
}
